import { supabaseAdmin } from '@/lib/supabase/admin';
import { callGoogle, GOOGLE_FREE_LIMITS } from './google';
import { callGroq, GROQ_FREE_LIMITS } from './groq';
import { callMistral, MISTRAL_FREE_LIMITS } from './mistral';
import { callOpenRouter } from './openrouter';

interface RouteResult {
  result: string;
  provider: string;
  model: string;
}

interface AISettings {
  ai_model_credentials?: Record<string, Record<string, string>>;
  content_provider: string;
  content_model: string;
  content_keys?: string;
  vision_provider: string;
  vision_model: string;
  vision_keys?: string;
}

/**
 * Fetch daily usage for a provider from ai_usage table.
 */
async function getDailyUsage(provider: string, date: string): Promise<number> {
  try {
    const { data } = await supabaseAdmin
      .from('ai_usage')
      .select('req_count')
      .eq('provider', provider)
      .eq('date', date)
      .single();
    return data?.req_count || 0;
  } catch {
    return 0;
  }
}

/**
 * Record a successful API call in ai_usage table.
 */
async function recordUsage(provider: string, tokenCount: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  try {
    await supabaseAdmin.rpc('increment_ai_usage', {
      p_provider: provider,
      p_date: today,
      p_tokens: tokenCount,
    });
  } catch {
    try {
      const { data: existing } = await supabaseAdmin
        .from('ai_usage')
        .select('id, req_count, token_count')
        .eq('provider', provider)
        .eq('date', today)
        .single();

      if (existing) {
        await supabaseAdmin
          .from('ai_usage')
          .update({ req_count: existing.req_count + 1, token_count: existing.token_count + tokenCount, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin
          .from('ai_usage')
          .insert({ provider, date: today, req_count: 1, token_count: tokenCount });
      }
    } catch { /* graceful degradation */ }
  }
}

/**
 * Check if provider has exceeded rate limit (80% threshold).
 */
async function isNearLimit(provider: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const usage = await getDailyUsage(provider, today);

  const limits: Record<string, number> = {
    google: GOOGLE_FREE_LIMITS['gemini-2.5-flash']?.reqPerDay || 1500,
    groq: GROQ_FREE_LIMITS.reqPerDay || 14400,
    mistral: 10000,
    openrouter: 5000,
  };

  const limit = limits[provider] || 5000;
  return usage >= limit * 0.8;
}

/**
 * Vision routing: Google -> Groq -> Mistral -> OpenRouter
 */
export async function routeVision(
  prompt: string,
  systemPrompt: string,
  imageUrl: string,
  keys: Record<string, string>,
): Promise<RouteResult> {
  const { base64, mimeType } = await fetchImageAsBase64(imageUrl);

  const fallbackChain: Array<{ provider: string; model: string; call: () => Promise<string> }> = [];

  if (keys.google) {
    fallbackChain.push({
      provider: 'google',
      model: 'gemini-2.5-flash',
      call: () => callGoogle(keys.google!, 'gemini-2.5-flash', prompt, systemPrompt, true, base64, mimeType),
    });
  }
  if (keys.groq) {
    fallbackChain.push({
      provider: 'groq',
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      call: () => callGroq(keys.groq!, 'meta-llama/llama-4-scout-17b-16e-instruct', prompt, systemPrompt, true, base64, mimeType),
    });
  }
  if (keys.mistral) {
    fallbackChain.push({
      provider: 'mistral',
      model: 'mistral-small-2506',
      call: () => callMistral(keys.mistral!, 'mistral-small-2506', prompt, systemPrompt, true, base64, mimeType),
    });
  }
  if (keys.openrouter) {
    fallbackChain.push({
      provider: 'openrouter',
      model: 'google/gemini-2.5-flash-preview:free',
      call: () => callOpenRouter(keys.openrouter!, 'google/gemini-2.5-flash-preview:free', prompt, systemPrompt, true, base64, mimeType),
    });
  }

  for (const step of fallbackChain) {
    const nearLimit = await isNearLimit(step.provider);
    if (nearLimit) continue;

    try {
      const result = await step.call();
      const tokenEstimate = prompt.length + systemPrompt.length + result.length;
      await recordUsage(step.provider, tokenEstimate);
      return { result, provider: step.provider, model: step.model };
    } catch (err: any) {
      if (err.status === 429 || err.status === 503) continue;
      throw err;
    }
  }

  throw new Error('All vision providers exhausted. Add API keys or switch providers.');
}

/**
 * Text routing: Groq (fastest) -> Google -> Mistral -> OpenRouter
 */
export async function routeText(
  prompt: string,
  systemPrompt: string,
  keys: Record<string, string>,
): Promise<RouteResult> {
  const fallbackChain: Array<{ provider: string; model: string; call: () => Promise<string> }> = [];

  if (keys.groq) {
    fallbackChain.push({
      provider: 'groq',
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      call: () => callGroq(keys.groq!, 'meta-llama/llama-4-scout-17b-16e-instruct', prompt, systemPrompt, false),
    });
  }
  if (keys.google) {
    fallbackChain.push({
      provider: 'google',
      model: 'gemini-2.5-flash',
      call: () => callGoogle(keys.google!, 'gemini-2.5-flash', prompt, systemPrompt, false),
    });
  }
  if (keys.mistral) {
    fallbackChain.push({
      provider: 'mistral',
      model: 'open-mistral-nemo',
      call: () => callMistral(keys.mistral!, 'open-mistral-nemo', prompt, systemPrompt, false),
    });
  }
  if (keys.openrouter) {
    fallbackChain.push({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      call: () => callOpenRouter(keys.openrouter!, 'meta-llama/llama-3.3-70b-instruct:free', prompt, systemPrompt, false),
    });
  }

  for (const step of fallbackChain) {
    const nearLimit = await isNearLimit(step.provider);
    if (nearLimit) continue;

    try {
      const result = await step.call();
      const tokenEstimate = prompt.length + systemPrompt.length + result.length;
      await recordUsage(step.provider, tokenEstimate);
      return { result, provider: step.provider, model: step.model };
    } catch (err: any) {
      if (err.status === 429 || err.status === 503) continue;
      throw err;
    }
  }

  throw new Error('All text providers exhausted. Add API keys or switch providers.');
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    base64: buffer.toString('base64'),
    mimeType: response.headers.get('content-type') || 'image/webp',
  };
}

/**
 * Collect keys from settings into a flat provider->key map.
 */
export function extractKeys(settings: AISettings): { vision: Record<string, string>; text: Record<string, string> } {
  const vision: Record<string, string> = {};
  const text: Record<string, string> = {};

  const allKeys = settings.ai_model_credentials || {};

  for (const section of ['content', 'vision'] as const) {
    const sectionKeys = allKeys[section] || {};
    for (const [provider, key] of Object.entries(sectionKeys)) {
      const cleanKey = key?.trim();
      if (cleanKey) {
        const dest = section === 'vision' ? vision : text;
        dest[provider] = cleanKey;
        if (provider === 'gemini') {
          dest['google'] = cleanKey;
        } else if (provider === 'google') {
          dest['gemini'] = cleanKey;
        }
      }
    }
  }

  // Fallback to legacy single key fields
  if (settings.vision_keys?.trim() && !vision[settings.vision_provider || 'gemini']) {
    const cleanKey = settings.vision_keys.trim();
    const provider = settings.vision_provider || 'gemini';
    vision[provider] = cleanKey;
    if (provider === 'gemini') {
      vision['google'] = cleanKey;
    } else if (provider === 'google') {
      vision['gemini'] = cleanKey;
    }
  }
  if (settings.content_keys?.trim() && !text[settings.content_provider || 'groq']) {
    const cleanKey = settings.content_keys.trim();
    const provider = settings.content_provider || 'groq';
    text[provider] = cleanKey;
    if (provider === 'gemini') {
      text['google'] = cleanKey;
    } else if (provider === 'google') {
      text['gemini'] = cleanKey;
    }
  }

  return { vision, text };
}
