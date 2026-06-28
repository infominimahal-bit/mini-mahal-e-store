/**
 * Google Indexing API — instantly notify Google when URLs are added/updated/deleted.
 * Uses service account JWT auth (no extra npm packages, uses built-in `crypto`).
 *
 * Setup:
 * 1. Go to https://console.cloud.google.com → Enable "Indexing API"
 * 2. Create a service account → download JSON key
 * 3. Add `GOOGLE_INDEXING_SA_EMAIL` and `GOOGLE_INDEXING_SA_KEY` to `.env.local`
 *    (SA_KEY = entire private_key value including -----BEGIN PRIVATE KEY-----)
 * 4. Verify site in Google Search Console
 * 5. Add service account email as a site owner in Search Console → Settings → Users
 *
 * Free tier: 200 URLs/day
 */

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_INDEXING_API = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function rs256Sign(data: string, privateKey: string): string {
  const crypto = require('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_INDEXING_SA_EMAIL;
  const privateKey = process.env.GOOGLE_INDEXING_SA_KEY;

  if (!email || !privateKey) {
    console.warn('[GoogleIndexing] Missing GOOGLE_INDEXING_SA_EMAIL or GOOGLE_INDEXING_SA_KEY in env');
    return null;
  }

  // Handle escaped newlines from .env / Vercel env vars
  const normalizedKey = privateKey.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const jwtHeader = base64UrlEncode(JSON.stringify(header));
  const jwtClaim = base64UrlEncode(JSON.stringify(claimSet));
  const signature = base64UrlEncode(rs256Sign(`${jwtHeader}.${jwtClaim}`, normalizedKey));
  const jwt = `${jwtHeader}.${jwtClaim}.${signature}`;

  try {
    const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[GoogleIndexing] Token exchange failed:', data);
      return null;
    }
    return data.access_token;
  } catch (err) {
    console.error('[GoogleIndexing] Token request error:', err);
    return null;
  }
}

/**
 * Notify Google of a URL change. 
 * @param url - Absolute URL (e.g. https://domain.com/product/some-product)
 * @param type - 'URL_UPDATED' (add/modify) or 'URL_DELETED' (remove)
 */
export async function notifyGoogleIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) return false;

    const res = await fetch(GOOGLE_INDEXING_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url, type }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`[GoogleIndexing] API error for ${url}:`, data);
      return false;
    }

    console.log(`[GoogleIndexing] ✅ ${type} — ${url}`);
    return true;
  } catch (err) {
    console.error('[GoogleIndexing] Request error:', err);
    return false;
  }
}

/**
 * Batch notify Google for multiple URLs (same type).
 * Google free tier: 200 URLs/day.
 */
export async function batchNotifyGoogle(urls: string[], type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'): Promise<number> {
  let successCount = 0;
  for (const url of urls) {
    const ok = await notifyGoogleIndexing(url, type);
    if (ok) successCount++;
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`[GoogleIndexing] Batch done: ${successCount}/${urls.length} notified`);
  return successCount;
}
