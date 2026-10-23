import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../../lib/rateLimit.mjs';
import { pool } from '../../../../lib/db.mjs';
import { hashPassword } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * POST /api/auth/reset-password { token, password }
 *
 * Validates a real, unused, unexpired reset token, sets the new password,
 * marks the token used (single-use), and revokes every existing session
 * for that account -- a password reset should log out every other device.
 */
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rate = await checkRateLimit({ key: `auth-reset-confirm:${ip}`, limit: 10, windowSeconds: 60 });
  if (!rate.allowed) {
    return NextResponse.json({ code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ code: 'BAD_JSON' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token : '';
  const password = body.password;
  if (!token) return NextResponse.json({ code: 'INVALID_TOKEN', message: 'Reset token is required' }, { status: 400 });
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Password must be 8-128 characters.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, user_id FROM password_reset_token
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        FOR UPDATE`,
      [tokenHash(token)]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ code: 'INVALID_TOKEN', message: 'This reset link is invalid or has expired.' }, { status: 400 });
    }
    const { id: resetId, user_id: userId } = rows[0];

    const passwordHash = await hashPassword(password);
    await client.query('UPDATE app_user SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, userId]);
    await client.query('UPDATE password_reset_token SET used_at = now() WHERE id = $1', [resetId]);
    await client.query('DELETE FROM user_session WHERE user_id = $1', [userId]);
    await client.query('COMMIT');

    return NextResponse.json({ message: 'Password updated. Sign in with your new password.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ code: 'RESET_PASSWORD_FAILED', message: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
