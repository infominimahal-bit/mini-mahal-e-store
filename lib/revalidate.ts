import { revalidateTag, revalidatePath } from 'next/cache';
import { getSiteUrl } from '@/lib/site-url-server';
import { notifyGoogleIndexing } from '@/lib/googleIndexing';
import { pingIndexNow } from '@/lib/indexNow';

const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function resolveSiteUrl(): Promise<string> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data } = await supabase
      .from('store_settings')
      .select('store_url')
      .eq('id', '00000000-0000-4000-8000-000000000001')
      .maybeSingle();
    return getSiteUrl({ storeUrl: data?.store_url });
  } catch (e) {
    console.warn('Failed to resolve dynamic siteUrl:', e);
  }
  return getSiteUrl();
}

async function purgeCloudflareUrls(urls: string[]) {
  if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
    console.warn('Cloudflare credentials missing. Skipping cache purge.');
    return;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error('Failed to purge Cloudflare cache:', data);
    } else {
      console.log('Successfully purged Cloudflare cache:', urls);
    }
  } catch (error) {
    console.error('Error purging Cloudflare cache:', error);
  }
}

async function purgeCloudflareEverything() {
  if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
    console.warn('Cloudflare credentials missing. Skipping complete cache purge.');
    return;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error('Failed to purge everything on Cloudflare:', data);
    } else {
      console.log('Successfully purged everything on Cloudflare');
    }
  } catch (error) {
    console.error('Error purging everything on Cloudflare:', error);
  }
}

export async function revalidateProduct(slug: string, action: 'UPDATED' | 'DELETED' = 'UPDATED') {
  try {
    (revalidateTag as any)(`product-${slug}`);
    (revalidateTag as any)('products');
    (revalidateTag as any)('homepage');
    (revalidateTag as any)('reviews');

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/admin', 'layout');
    if (action !== 'DELETED') revalidatePath(`/product/${slug}`);

    await purgeCloudflareEverything();

    // Notify search engines for instant indexing
    const siteUrl = await resolveSiteUrl();
    const productUrl = `${siteUrl}/product/${slug}`;

    if (action === 'DELETED') {
      await notifyGoogleIndexing(productUrl, 'URL_DELETED');
    } else {
      await notifyGoogleIndexing(productUrl, 'URL_UPDATED');
    }

    await pingIndexNow([productUrl], siteUrl);
    console.log(`[revalidate] Product ${action}: ${slug}`);
  } catch (error) {
    console.error(`Error in revalidateProduct for ${slug}:`, error);
  }
}

export async function revalidateBanner() {
  try {
    (revalidateTag as any)('banners');
    (revalidateTag as any)('homepage');
    (revalidateTag as any)('homepage_sections');
    (revalidateTag as any)('products');

    // Purge page routing cache
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/admin', 'layout');

    const dynamicSiteUrl = await resolveSiteUrl();
    const urls = [
      `${dynamicSiteUrl}/`,
      `${dynamicSiteUrl}`,
      `${dynamicSiteUrl}/shop`,
    ];
    await purgeCloudflareUrls(urls);
    console.log('[revalidate] Banners & homepage revalidated');
  } catch (error) {
    console.error('Error in revalidateBanner:', error);
    throw error;
  }
}

export async function revalidateCategory(slug: string, action: 'UPDATED' | 'DELETED' = 'UPDATED') {
  try {
    (revalidateTag as any)(`category-${slug}`);
    (revalidateTag as any)('categories');
    (revalidateTag as any)('products');

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/admin', 'layout');
    if (action !== 'DELETED') revalidatePath(`/category/${slug}`);

    await purgeCloudflareEverything();

    const siteUrl = await resolveSiteUrl();
    const categoryUrl = `${siteUrl}/shop?category=${slug}`;

    if (action === 'DELETED') {
      await notifyGoogleIndexing(categoryUrl, 'URL_DELETED');
    } else {
      await notifyGoogleIndexing(categoryUrl, 'URL_UPDATED');
    }

    await pingIndexNow([categoryUrl], siteUrl);
    console.log(`[revalidate] Category ${action}: ${slug}`);
  } catch (error) {
    console.error(`Error in revalidateCategory for ${slug}:`, error);
  }
}

export async function revalidateHomepage() {
  try {
    (revalidateTag as any)('homepage');
    (revalidateTag as any)('products');

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/admin', 'layout');

    const dynamicSiteUrl = await resolveSiteUrl();
    const urls = [
      `${dynamicSiteUrl}/`,
      `${dynamicSiteUrl}/shop`,
    ];
    await purgeCloudflareUrls(urls);

    for (const url of urls) {
      await notifyGoogleIndexing(url, 'URL_UPDATED');
    }
    await pingIndexNow(urls, dynamicSiteUrl);
    console.log('[revalidate] Homepage revalidated');
  } catch (error) {
    console.error('Error in revalidateHomepage:', error);
  }
}

export async function revalidateSettings() {
  try {
    (revalidateTag as any)('settings');
    (revalidateTag as any)('homepage');
    (revalidateTag as any)('homepage_sections');
    (revalidateTag as any)('products');
    (revalidateTag as any)('categories');
    (revalidateTag as any)('banners');

    // Revalidate the entire site (including layout metadata, favicon, titles)
    revalidatePath('/', 'layout');
    revalidatePath('/admin', 'layout');

    await purgeCloudflareEverything();
    console.log('[revalidate] Settings revalidated + complete Cloudflare cache purged');
  } catch (error) {
    console.error('Error in revalidateSettings:', error);
    throw error;
  }
}
