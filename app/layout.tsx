import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

import ThemeStyleRegistry from '@/components/common/ThemeStyleRegistry';
import { getSettings } from '@/lib/services/settings';
import { getDomainConfig } from '@/lib/config/domains';
import { getDomainBrand } from '@/lib/utils/getDomainBrand';
import Pixels from '@/components/Pixels';
import ChunkErrorListener from '@/components/common/ChunkErrorListener';

const getFaviconType = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.svg')) return 'image/svg+xml';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  return 'image/x-icon';
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const brand = await getDomainBrand();
    const settings = await getSettings();
    const siteUrl = `${brand.protocol}://${brand.domain}`;

    const description = settings.metaDescription || brand.tagline || `Discover amazing deals at ${brand.name}. Quality items with fast delivery.`;
    const title = settings.metaTitle || brand.tagline || brand.name;

    const timestamp = settings.updatedAt ? new Date(settings.updatedAt).getTime() : Date.now();

    const fav = settings.faviconUrl
      ? `${settings.faviconUrl}?v=${timestamp}`
      : settings.logoUrl
        ? `${settings.logoUrl}?v=${timestamp}`
        : `/favicon.ico?v=${timestamp}`;

    const appleTouchIcon = settings.logoUrl
      ? `${settings.logoUrl}?v=${timestamp}`
      : settings.faviconUrl
        ? `${settings.faviconUrl}?v=${timestamp}`
        : `/favicon.ico?v=${timestamp}`;

    const ogImage = settings.bannerUrl
      ? settings.bannerUrl
      : settings.logoUrl
        ? settings.logoUrl
        : settings.faviconUrl
          ? settings.faviconUrl
          : `/favicon.ico?v=${timestamp}`;

    return {
      metadataBase: new URL(siteUrl),
      title: {
        default: title,
        template: `%s - ${brand.name}`
      },
      description,
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title,
      },
      icons: {
        icon: [
          {
            url: fav,
            type: getFaviconType(fav),
          },
          {
            url: fav,
            sizes: '32x32',
            type: getFaviconType(fav),
          },
          {
            url: fav,
            sizes: '16x16',
            type: getFaviconType(fav),
          },
        ],
        shortcut: fav,
        apple: appleTouchIcon,
      },
      verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION || '',
      },
      other: {
        'og:locale': 'en_US',
      },
      openGraph: {
        type: 'website',
        title,
        description,
        url: siteUrl,
        siteName: brand.name,
        locale: 'en_US',
        images: [{ url: ogImage, width: 1200, height: 630, alt: brand.name }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
        site: settings.twitter_handle || process.env.NEXT_PUBLIC_TWITTER_HANDLE || '',
        creator: settings.twitter_handle || process.env.NEXT_PUBLIC_TWITTER_HANDLE || '',
      }
    };
  } catch {
    return {
      title: 'Store',
      description: 'Premium online store.',
      metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: 'Store',
      },
      verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION || '',
      },
      other: {
        'og:locale': 'en_US',
      },
      openGraph: {
        type: 'website',
        title: 'Store',
        description: 'Premium online store.',
        siteName: 'Store',
        images: [{ url: '/favicon.ico' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Store',
        description: 'Premium online store.',
        images: ['/favicon.ico'],
      }
    };
  }
}

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();
  let siteUrl = settings?.storeUrl?.replace(/\/+$/, '') || process.env.NEXT_PUBLIC_SITE_URL || '';

  let storeName = 'Store';
  let description = 'Premium online store.';
  try {
    const brand = await getDomainBrand();
    storeName = brand.name;
    siteUrl = `${brand.protocol}://${brand.domain}`;
    description = settings.metaDescription || brand.tagline || `Discover amazing deals at ${storeName}.`;
  } catch {
    // Fallback already set above
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${outfit.variable} h-full antialiased overflow-x-clip`}
    >
      <head>
        <ThemeStyleRegistry settings={settings} />
      </head>
      <body suppressHydrationWarning className={`${jakarta.variable} ${outfit.variable} font-body min-h-full flex flex-col bg-gray-50 dark:bg-[#0f0f1b] text-gray-900 dark:text-gray-100 overflow-x-clip`}>
        {/* Conditional Script Injection for Tracking Pixels */}
        <Pixels />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ChunkErrorListener />
          {children}
          <Toaster 
            position="bottom-center" 
            toastOptions={{
              className: 'dark:bg-[#16162a] dark:text-white dark:border-gray-800 rounded-2xl shadow-lg border border-gray-100 font-semibold',
              style: {
                fontSize: '11px',
                padding: '10px 14px',
                maxWidth: '300px',
                marginBottom: '72px',
              }
            }} 
            closeButton 
          />
          
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(){
                  var p = window.location.pathname;
                  var m = p.startsWith('/admin') ? '/admin-manifest.json' : '/manifest.json';
                  var el = document.createElement('link');
                  el.rel = 'manifest';
                  el.href = m;
                  document.head.appendChild(el);
                })();
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (var i = 0; i < registrations.length; i++) {
                      registrations[i].unregister();
                      console.log('Service Worker unregistered to prevent stale cache & WebView bugs.');
                    }
                  });
                }
              `,
            }}
          />
          {/* JSON-LD Schema — WebSite + Organization */}
          {settings && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@graph': [
                    {
                      '@type': 'WebSite',
                      name: storeName,
                      url: settings.storeUrl || '',
                      description: description,
                      potentialAction: {
                        '@type': 'SearchAction',
                        target: {
                          '@type': 'EntryPoint',
                          urlTemplate: `${settings.storeUrl || ''}/search?q={search_term_string}`,
                        },
                        'query-input': 'required name=search_term_string',
                      },
                    },
                    {
                      '@type': 'Organization',
                      name: storeName,
                      url: settings.storeUrl || '',
                      logo: settings.logoUrl || '',
                      image: settings.bannerUrl || settings.logoUrl || '',
                      description: description,
                    },
                  ],
                }, null, 2),
              }}
            />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
