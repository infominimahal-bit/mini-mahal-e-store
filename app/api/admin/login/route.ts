import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Set internal next/headers cookie store
              cookieStore.set(name, value, options);
              // Explicitly attach to the outgoing response to guarantee delivery
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Authenticate via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Admin email check
    const allowedAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (allowedAdminEmail && authData.user.email !== allowedAdminEmail) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Access denied: Not authorized for admin portal.' },
        { status: 403 }
      );
    }

    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
