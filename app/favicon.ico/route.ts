import { getSettings } from '@/lib/services/settings';

export const revalidate = 0; // Fully dynamic — reads from store settings

// Minimal 1x1 transparent ICO (48 bytes) — used only if no logo/favicon in settings
const TRANSPARENT_ICO = Buffer.from(
  '000001000100010001000100200000001600000016000000' +
  '28000000010000000200000001002000000000000400000000000000' +
  '000000000000000000000000000000000000',
  'hex'
);

export async function GET() {
  try {
    const settings = await getSettings();
    const faviconUrl = settings.faviconUrl || settings.logoUrl;

    if (faviconUrl) {
      const res = await fetch(faviconUrl, { cache: 'no-store' });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/x-icon';
        const buffer = await res.arrayBuffer();
        return new Response(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }
    }
  } catch (e) {
    console.error('[favicon] Failed to serve dynamic favicon:', e);
  }

  // No favicon/logo set in settings — return minimal transparent ICO (no static file needed)
  return new Response(TRANSPARENT_ICO, {
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

