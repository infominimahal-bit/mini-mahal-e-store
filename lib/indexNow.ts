/**
 * Pings IndexNow search engine indexing API with lists of created/modified page URLs.
 * Automatically notifies Bing, Yandex, Naver, Seznam, and other supporting engines.
 * 
 * @param urls Array of absolute page URLs to index (e.g., ['https://zaynahs.pk/products/cotton-shirt'])
 */
export async function pingIndexNow(urls: string[], siteUrlOverride?: string): Promise<boolean> {
  try {
    const key = process.env.INDEXNOW_API_KEY || '';

    if (!key || key === 'yahan_indexnow_api_key_paste_karo') {
      console.warn('[IndexNow] Missing INDEXNOW_API_KEY. Skipping ping.');
      return false;
    }

    // Derive host from first URL if siteUrl not provided
    const siteUrl = siteUrlOverride || process.env.NEXT_PUBLIC_SITE_URL || (urls[0] ? new URL(urls[0]).origin : '');
    if (!siteUrl) {
      console.warn('[IndexNow] Missing siteUrl. Skipping ping.');
      return false;
    }

    const host = siteUrl.replace(/^https?:\/\//, '').split('/')[0];
    const keyLocation = `${siteUrl}/${key}.txt`;

    console.log(`[IndexNow] Pinging ${urls.length} URLs for host: ${host}`);

    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        host,
        key,
        keyLocation,
        urlList: urls
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[IndexNow] API responded with error status ${response.status}:`, text);
      return false;
    }

    console.log('[IndexNow] URLs submitted successfully!');
    return true;
  } catch (error) {
    console.error('[IndexNow] Failed to ping IndexNow API:', error);
    return false;
  }
}
