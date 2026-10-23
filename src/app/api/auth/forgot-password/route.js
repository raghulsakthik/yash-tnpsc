import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../../lib/rateLimit.mjs';
import { pool } from '../../../../lib/db.mjs';
import { emailConfigured, sendPasswordResetEmail } from '../../../../lib/email.mjs';

export const dynamic = 'force-dynamic';

const RESET_TOKEN_HOURS = 1;

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * POST /api/auth/forgot-password { email }
 *
 * Always responds the same way regardless of whether the email exists --
 * revealing which emails have accounts is an account-enumeration leak.
 * Real work (token creation + email) only happens when a matching,
 * email-having account is found.
 */
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rate = await checkRateLimit({ key: `auth-reset:${ip}`, limit: 5, windowSeconds: 60 });
  if (!rate.allowed) {
    return NextResponse.json({ code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ code: 'BAD_JSON' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const genericResponse = () => NextResponse.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  if (!email) return genericResponse();

  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id FROM app_user WHERE lower(email) = lower($1)', [email]);
    const userId = rows[0]?.id;
    if (!userId) return genericResponse();

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO password_reset_token (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, tokenHash(token), expiresAt]
    );

    if (emailConfigured) {
      await sendPasswordResetEmail(email, token).catch(() => {});
    }

    return genericResponse();
  } catch (err) {
    return NextResponse.json({ code: 'FORGOT_PASSWORD_FAILED', message: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
