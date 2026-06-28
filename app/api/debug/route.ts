import { NextResponse } from 'next/server';
import { pingIndexNow } from '@/lib/indexNow';

export async function GET() {
  const key = process.env.INDEXNOW_API_KEY || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  let parsed = false;
  let extractedKey = key;
  let host = '';
  
  try {
    const p = JSON.parse(key);
    if (typeof p === 'object') {
      parsed = true;
      host = 'www.totvogue.pk';
      extractedKey = p[host] || 'NOT_FOUND';
    }
  } catch {}
  
  const info = {
    keyExists: !!key,
    keyLength: key.length,
    keyIsJSON: parsed,
    extractedKey,
    hostCheck: host ? extractedKey : 'N/A',
    siteUrl,
    nextPublicSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
    keyFirst20: key.substring(0, 20),
    envKeys: Object.keys(process.env).filter(k => k.includes('INDEX') || k.includes('SITE') || k.includes('BRAND')),
  };

  try {
    (info as any).pingResult = await pingIndexNow(['https://www.totvogue.pk/']);
  } catch (e: any) {
    (info as any).pingResult = 'error: ' + e.message;
  }

  return NextResponse.json(info);
}
