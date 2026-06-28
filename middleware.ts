import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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

  const { pathname, searchParams } = request.nextUrl;

  // Catch password reset code on root path and redirect to admin reset page
  if (pathname === '/' && searchParams.get('code')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/reset-password';
    const redirectRes = NextResponse.redirect(url);
    // Preserve cookies set by supabase (if any)
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c.name, c.value);
    });
    return redirectRes;
  }

  // Public admin paths — no auth required
  const isPublicAdminPath =
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/admin/forgot-password') ||
    pathname.startsWith('/admin/reset-password');

  if (isPublicAdminPath) {
    return supabaseResponse;
  }

  // Only protect /admin/* routes
  if (pathname.startsWith('/admin/')) {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.log(`[middleware] getUser() error: ${error.message}`);
    }

    if (!data?.user) {
      console.log('[middleware] No user — redirecting to /admin/login');
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      const redirectRes = NextResponse.redirect(url);
      
      // Preserve any cookie updates from createServerClient (e.g. chunking refresh)
      supabaseResponse.cookies.getAll().forEach((c) => {
        redirectRes.cookies.set(c.name, c.value);
      });
      
      return redirectRes;
    }
  }

  // Cloudflare cache override for admin pages
  supabaseResponse.headers.set(
    'cdn-cache-control',
    'no-cache, no-store, must-revalidate'
  );

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*', '/'],
};
