import { NextResponse } from 'next/server';

// Edge-runtime gate, so it can only check cookie presence, not validate the
// session against the database (that needs `pg`, which is Node-only --
// see scripts/engagement-scheduler.mjs's header comment for why mixing
// Node-only code into anything Next bundles for Edge breaks the whole app).
// Real validation happens per-route via getSession() in src/lib/auth.mjs.
// /privacy must be reachable with no session -- it's the URL handed to
// Meta's App Settings (WhatsApp Cloud API requires one to go Live), and
// Meta's own reviewer/crawler never logs in to fetch it.
// / must be public too: it renders the real nova-ui app (src/app/page.js),
// which has its own AuthModal and isLoggedIn state (see .nova-zip-ui/src/App.tsx)
// -- the same pattern the Android app uses. Gating it here meant every
// unauthenticated visitor got redirected to the separate, differently-styled
// /login page and never saw the real app's own sign-in experience at all.
const PUBLIC_PATHS = ['/', '/login', '/register', '/privacy'];
// /api/app/version is public on purpose -- the Android app checks it on
// every launch to show an "update available" banner, which has to work
// before the app knows whether its own session is still valid.
const PUBLIC_API_PATHS = ['/api/health', '/api/ready', '/api/app/version'];
// /api/cron/* authenticates itself via an Authorization: Bearer CRON_SECRET
// header (see src/app/api/cron/*/route.js) -- a cron job has no session
// cookie to present, so without this it was being blocked here with 401
// before its own auth check ever ran. That meant the notification
// schedulers could never actually fire once deployed, cookie-gate or not.
const PUBLIC_PREFIXES = ['/api/auth', '/api/cron', '/_next', '/sw.js', '/manifest', '/icons', '/favicon', '/nova-ui'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_API_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
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
