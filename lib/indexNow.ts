/**
 * Pings IndexNow search engine indexing API with lists of created/modified page URLs.
 * Automatically notifies Bing, Yandex, Naver, Seznam, and other supporting engines.
 * 
 * @param urls Array of absolute page URLs to index (e.g., ['https://example.com/products/cotton-shirt'])
 */
export async function pingIndexNow(urls: string[], siteUrlOverride?: string): Promise<boolean> {
  try {
    let key = process.env.INDEXNOW_API_KEY || '';

    if (!key || key === 'yahan_indexnow_api_key_paste_karo') {
      console.warn('[IndexNow] Missing INDEXNOW_API_KEY. Skipping ping.');
      return false;
    }

    // Support multi-domain: INDEXNOW_API_KEY can be JSON {domain: key}
    // or plain string (backward compatible)
    const siteUrl = siteUrlOverride || process.env.NEXT_PUBLIC_SITE_URL || (urls[0] ? new URL(urls[0]).origin : '');
    if (!siteUrl) {
      console.warn('[IndexNow] Missing siteUrl. Skipping ping.');
      return false;
    }

    const host = siteUrl.replace(/^https?:\/\//, '').split('/')[0];

    try {
      const parsed = JSON.parse(key);
      if (typeof parsed === 'object' && parsed[host]) {
        key = parsed[host];
      }
    } catch {}

    const keyLocation = `${siteUrl}/${key}.txt`;

    console.log(`[IndexNow] Pinging ${urls.length} URLs for host: ${host}`);

    const body = JSON.stringify({
      host,
      key,
      keyLocation,
      urlList: urls
    });

    console.log(`[IndexNow] Sending to host=${host} keyLocation=${keyLocation}`);

    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body
    });

    const text = await response.text();

    if (!response.ok) {
      console.error(`[IndexNow] API error ${response.status}:`, text);
      return false;
    }

    if (text && text.includes('error')) {
      console.warn(`[IndexNow] API warning (${response.status}):`, text);
    }

    console.log(`[IndexNow] Success (${response.status}):`, text || '(no body)');
    return true;
  } catch (error) {
    console.error('[IndexNow] Failed to ping IndexNow API:', error);
    return false;
  }
}
