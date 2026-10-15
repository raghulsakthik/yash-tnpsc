import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../lib/db.mjs';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken, authEnabled } from '../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'nova_session';
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * GET /api/auth
 *
 * {authEnabled, hasPassword, authenticated} — the frontend uses this to
 * decide which onboarding screen to show (set a password vs. log in vs.
 * already in). authEnabled is false whenever SESSION_SECRET is unset —
 * the whole feature is a no-op then, by design.
 */
export async function GET(request) {
  if (!authEnabled()) {
    return NextResponse.json({ authEnabled: false, hasPassword: false, authenticated: true });
  }
  const { rows } = await query(`SELECT password_hash FROM learner WHERE id = $1`, [LEARNER_ID]);
  const hasPassword = Boolean(rows[0]?.password_hash);
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authenticated = Boolean(await verifySessionToken(token));
  return NextResponse.json({ authEnabled: true, hasPassword, authenticated });
}

/**
 * POST /api/auth
 * body: { password }
 *
 * First call ever (no password_hash stored) sets it — that's
 * "registration" for a single-learner app — and logs in. Every later call
 * verifies. Either way, success sets the session cookie.
 */
export async function POST(request) {
  if (!authEnabled()) {
    return NextResponse.json({ code: 'AUTH_DISABLED', message: 'SESSION_SECRET is not set' }, { status: 400 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }
  const { password } = body;
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' },
      { status: 400 }
    );
  }

  const { rows } = await query(`SELECT password_hash FROM learner WHERE id = $1`, [LEARNER_ID]);
  const existingHash = rows[0]?.password_hash;

  let created = false;
  if (!existingHash) {
    await query(`UPDATE learner SET password_hash = $1 WHERE id = $2`, [hashPassword(password), LEARNER_ID]);
    created = true;
  } else if (!verifyPassword(password, existingHash)) {
    return NextResponse.json({ code: 'WRONG_PASSWORD', message: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ authenticated: true, created });
  res.cookies.set(COOKIE_NAME, await createSessionToken(LEARNER_ID), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
  return res;
}

/** DELETE /api/auth — logout. */
export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
