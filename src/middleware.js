import { NextResponse } from 'next/server';

// Edge-runtime gate, so it can only check cookie presence, not validate the
// session against the database (that needs `pg`, which is Node-only --
// see scripts/engagement-scheduler.mjs's header comment for why mixing
// Node-only code into anything Next bundles for Edge breaks the whole app).
// Real validation happens per-route via getSession() in src/lib/auth.mjs.
const PUBLIC_PATHS = ['/login', '/register'];
const PUBLIC_PREFIXES = ['/api/auth', '/_next', '/sw.js', '/manifest', '/icons', '/favicon'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has('session_token');
  if (!hasSession && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  if (!hasSession && pathname.startsWith('/api/')) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
