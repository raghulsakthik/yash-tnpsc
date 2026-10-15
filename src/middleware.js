import { NextResponse } from 'next/server';
import { verifySessionToken, authEnabled } from './lib/session.mjs';

const COOKIE_NAME = 'nova_session';
const PUBLIC_PREFIXES = ['/proto/onboarding', '/proto/login', '/proto/register', '/proto/landing', '/proto/placement'];

/**
 * Gates /proto/* pages and /api/** (except /api/auth) behind a session
 * cookie — only once SESSION_SECRET is set. Unset (as it is until an
 * operator opts in), this no-ops entirely: every route behaves exactly as
 * it did before auth existed. That's deliberate — see docs/data-contracts.md's
 * sibling, the Phase 8 plan: adding auth must never be a breaking change
 * for the existing single-learner data path.
 */
export async function middleware(request) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/auth')) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const learnerId = await verifySessionToken(token);
  if (learnerId) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'Log in first' }, { status: 401 });
  }
  if (pathname.startsWith('/proto') && !PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/proto/onboarding';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/proto/:path*', '/api/:path*'],
};
