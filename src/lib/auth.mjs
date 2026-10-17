import crypto from 'crypto';
import { query } from './db.mjs';

const SESSION_COOKIE = 'session_token';
const SESSION_DAYS = 30;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

/** Creates a server-side session row and returns the token + its cookie options. */
export async function createSession(accountId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query('INSERT INTO session (token, account_id, expires_at) VALUES ($1, $2, $3)', [
    token,
    accountId,
    expiresAt,
  ]);
  return {
    token,
    cookie: {
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    },
  };
}

export async function destroySession(token) {
  if (!token) return;
  await query('DELETE FROM session WHERE token = $1', [token]);
}

/** Reads the session cookie off a Next.js Request and resolves the account it belongs to. */
export async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { rows } = await query(
    `SELECT a.id AS account_id, a.email, a.role, a.learner_id
       FROM session s JOIN account a ON a.id = s.account_id
      WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  return { token, accountId: row.account_id, email: row.email, role: row.role, learnerId: row.learner_id };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/** Resolves the learner id behind a request's session, or null if there isn't one (no session, or an admin account with no learner data). */
export async function requireLearnerId(request) {
  const session = await getSession(request);
  return session?.learnerId ?? null;
}
