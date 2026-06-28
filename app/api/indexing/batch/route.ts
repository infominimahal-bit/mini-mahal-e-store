import { NextRequest, NextResponse } from 'next/server';
import { notifyGoogleIndexing } from '@/lib/googleIndexing';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/indexing/batch
 * Body: { urls: string[], type?: "URL_UPDATED" | "URL_DELETED" }
 * Max 200 URLs per batch (Google limit).
 */
export async function POST(req: NextRequest) {
  try {
    const { urls, type = 'URL_UPDATED' } = await req.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ success: false, error: 'urls array is required' }, { status: 400 });
    }

    if (!['URL_UPDATED', 'URL_DELETED'].includes(type)) {
      return NextResponse.json({ success: false, error: 'type must be URL_UPDATED or URL_DELETED' }, { status: 400 });
    }

    const batch = urls.slice(0, 200);
    const results: { url: string; success: boolean }[] = [];
    let successCount = 0;

    for (const url of batch) {
      const ok = await notifyGoogleIndexing(url, type as 'URL_UPDATED' | 'URL_DELETED');
      results.push({ url, success: ok });
      if (ok) successCount++;

      try {
        await supabaseAdmin.from('indexing_log').insert({
          url,
          type,
          status: ok ? 'submitted' : 'failed',
          response: ok ? 'ok' : 'api_error',
        });
      } catch { /* graceful */ }

      await new Promise(r => setTimeout(r, 200));
    }

    return NextResponse.json({
      success: successCount,
      failed: batch.length - successCount,
      total: batch.length,
      results,
    });
  } catch (err: any) {
    console.error('[Indexing Batch API]', err);
    return NextResponse.json({ success: 0, failed: 0, error: err.message }, { status: 500 });
  }
}
