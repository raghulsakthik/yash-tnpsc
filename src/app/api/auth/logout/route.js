import { NextResponse } from 'next/server';
import { destroySession, SESSION_COOKIE_NAME } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  await destroySession(token);
  const res = NextResponse.json({ loggedOut: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
