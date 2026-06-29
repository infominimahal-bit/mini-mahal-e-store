import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { recordVisitor, clearOldEntries } from '@/lib/traffic/store';

export async function proxy(request: NextRequest) {
  // Record Vercel edge visitor headers — store routes only (not admin/api)
  const { pathname } = request.nextUrl;
  const isStoreRoute = !pathname.startsWith('/admin') && !pathname.startsWith('/api') && !pathname.startsWith('/_next');
  if (isStoreRoute) {
    const rawCity = request.headers.get('x-vercel-ip-city') || '';
    const ipCountry = request.headers.get('x-vercel-ip-country') || '';
    if (rawCity && ipCountry) {
      const ipCity = decodeURIComponent(rawCity);
      recordVisitor(ipCity, ipCountry);
    }
  }

  // Periodic flush of old entries (runs ~every 50 requests)
  if (Math.random() < 0.02) {
    clearOldEntries();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const searchParams = request.nextUrl.searchParams;

  if (pathname === '/' && searchParams.get('code')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/reset-password';
    const redirectRes = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c.name, c.value);
    });
    return redirectRes;
  }

  const isPublicAdminPath =
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/admin/forgot-password') ||
    pathname.startsWith('/admin/reset-password');

  if (isPublicAdminPath) {
    return supabaseResponse;
  }

  if (pathname.startsWith('/admin/')) {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.log(`[proxy] getUser() error: ${error.message}`);
    }

    if (!data?.user) {
      console.log('[proxy] No user — redirecting to /admin/login');
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('_nocache', Date.now().toString());

      const redirectRes = NextResponse.redirect(url);

      supabaseResponse.cookies.getAll().forEach((c) => {
        redirectRes.cookies.set(c.name, c.value);
      });

      redirectRes.headers.set('cdn-cache-control', 'no-store, no-cache, must-revalidate');
      redirectRes.headers.set('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

      return redirectRes;
    }
  }

  if (isStoreRoute) {
    supabaseResponse.headers.set(
      'cdn-cache-control',
      'public, s-maxage=86400, stale-while-revalidate=60'
    );
  } else {
    supabaseResponse.headers.set(
      'cdn-cache-control',
      'no-cache, no-store, must-revalidate'
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
