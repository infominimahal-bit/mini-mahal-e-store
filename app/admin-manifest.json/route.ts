import { getSettings } from '@/lib/services/settings';

export const revalidate = 0; // Serve dynamically to ensure dynamic branding updates

export async function GET() {
  try {
    const settings = await getSettings();
    const brandName = settings.storeName || 'TotVogue.pk';
    // Use only settings-driven URLs — /favicon.ico itself reads from settings dynamically
    const faviconUrl = settings.faviconUrl || settings.logoUrl || '/favicon.ico';
    const logoUrl = settings.logoUrl || settings.faviconUrl || '/favicon.ico';

    const manifestData = {
      name: `${brandName} Admin`,
      short_name: 'Admin',
      description: `${brandName} Admin Dashboard`,
      start_url: '/admin/dashboard',
      scope: '/admin/',
      display: 'standalone',
      background_color: '#0f0f1b',
      theme_color: '#1a1a2e',
      orientation: 'portrait',
      icons: [
        {
          src: faviconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    };

    return new Response(JSON.stringify(manifestData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Failed to generate dynamic admin manifest:', error);
    return new Response(JSON.stringify({}), { status: 500 });
  }
}

