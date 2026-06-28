import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const txtMatch = pathname.match(/^\/([a-f0-9]+)\.txt$/);
  if (txtMatch) {
    const key = txtMatch[1];
    const expectedKey = process.env.INDEXNOW_API_KEY;
    if (key === expectedKey) {
      return new NextResponse(key, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|static|fonts|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)'],
};
