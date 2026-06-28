import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/services/settings';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { pingIndexNow } from '@/lib/indexNow';
import { notifyGoogleIndexing } from '@/lib/googleIndexing';

/**
 * GET /api/seo/test
 * Tests SEO setup: sitemap, robots, canonical, IndexNow, Google Indexing
 */
export async function GET() {
  const results: Record<string, any> = {};

  // 1. Check settings
  try {
    const settings = await getSettings();
    results.settings = { status: 'ok', storeUrl: settings.storeUrl, storeName: settings.storeName };
  } catch (e: any) {
    results.settings = { status: 'fail', error: e.message };
  }

  // 2. Check sitemap products count
  try {
    const { count } = await supabaseAdmin
      .from('products')
      .select('slug', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('is_active', true);
    results.products = { status: 'ok', activeCount: count };
  } catch (e: any) {
    results.products = { status: 'fail', error: e.message };
  }

  // 3. Check sitemap categories count
  try {
    const { count } = await supabaseAdmin
      .from('categories')
      .select('slug', { count: 'exact', head: true })
      .eq('active', true);
    results.categories = { status: 'ok', activeCount: count };
  } catch (e: any) {
    results.categories = { status: 'fail', error: e.message };
  }

  // 4. Check IndexNow key
  results.indexNow = {
    status: process.env.INDEXNOW_API_KEY ? 'ok' : 'missing',
    keySet: !!process.env.INDEXNOW_API_KEY,
  };

  // 5. Check Google Indexing API
  results.googleIndexing = {
    status: (process.env.GOOGLE_INDEXING_SA_EMAIL && process.env.GOOGLE_INDEXING_SA_KEY) ? 'ok' : 'not configured',
    emailSet: !!process.env.GOOGLE_INDEXING_SA_EMAIL,
    keySet: !!process.env.GOOGLE_INDEXING_SA_KEY,
  };

  // 6. Check Cloudflare
  results.cloudflare = {
    status: (process.env.CLOUDFLARE_ZONE_ID && process.env.CLOUDFLARE_API_TOKEN) ? 'ok' : 'missing',
    zoneSet: !!process.env.CLOUDFLARE_ZONE_ID,
    tokenSet: !!process.env.CLOUDFLARE_API_TOKEN,
  };

  // 7. Test IndexNow ping
  try {
    const testUrl = results.settings?.storeUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const indexNowResult = await pingIndexNow([`${testUrl}/`], testUrl);
    results.indexNowTest = { status: indexNowResult ? 'ok' : 'failed', note: indexNowResult ? '' : 'ping returned false (check logs)' };
  } catch (e: any) {
    results.indexNowTest = { status: 'fail', error: e.message };
  }

  // 8. Test Google Indexing API (only if configured)
  if (process.env.GOOGLE_INDEXING_SA_EMAIL && process.env.GOOGLE_INDEXING_SA_KEY) {
    try {
      const testUrl = results.settings?.storeUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      results.googleIndexingTest = await notifyGoogleIndexing(`${testUrl}/`, 'URL_UPDATED').then(
        ok => ({ status: ok ? 'ok' : 'failed' }),
        err => ({ status: 'failed', error: err.message })
      );
    } catch (e: any) {
      results.googleIndexingTest = { status: 'fail', error: e.message };
    }
  } else {
    results.googleIndexingTest = { status: 'skipped', reason: 'Google Indexing not configured' };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
    summary: {
      allPassed: Object.values(results).every((r: any) => r.status === 'ok' || r.status === 'skipped'),
      total: Object.keys(results).length,
      passed: Object.values(results).filter((r: any) => r.status === 'ok').length,
      failed: Object.values(results).filter((r: any) => r.status === 'fail' || r.status === 'missing' || r.status === 'not configured').length,
    },
  });
}
