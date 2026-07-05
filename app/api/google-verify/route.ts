import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const expectedCode = process.env.GOOGLE_SITE_VERIFICATION;

  if (!expectedCode || !code) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const content = `google-site-verification: google${code}.html`;

  return new NextResponse(content, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}
