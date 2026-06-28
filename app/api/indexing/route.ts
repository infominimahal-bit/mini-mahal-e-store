import { NextRequest, NextResponse } from 'next/server';
import { notifyGoogleIndexing } from '@/lib/googleIndexing';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/indexing
 * Body: { url: string, type?: "URL_UPDATED" | "URL_DELETED" }
 */
export async function POST(req: NextRequest) {
  try {
    const { url, type = 'URL_UPDATED' } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'url is required' }, { status: 400 });
    }

    if (!['URL_UPDATED', 'URL_DELETED'].includes(type)) {
      return NextResponse.json({ success: false, error: 'type must be URL_UPDATED or URL_DELETED' }, { status: 400 });
    }

    const success = await notifyGoogleIndexing(url, type as 'URL_UPDATED' | 'URL_DELETED');

    // Log to indexing_log table
    try {
      await supabaseAdmin.from('indexing_log').insert({
        url,
        type,
        status: success ? 'submitted' : 'failed',
        response: success ? 'ok' : 'api_error',
      });
    } catch { /* graceful */ }

    return NextResponse.json({ success, url, type });
  } catch (err: any) {
    console.error('[Indexing API]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
