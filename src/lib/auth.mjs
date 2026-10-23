import { cookies } from 'next/headers';
import crypto from 'crypto';
import { query } from './db.mjs';
import { hasPermission } from './permissions.mjs';

const SESSION_COOKIE = 'session_token';
const SESSION_DAYS = 30;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash || !/^[0-9a-f]+$/i.test(salt) || !/^[0-9a-f]+$/i.test(hash)) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const expected = Buffer.from(hash, 'hex');
  const actual = Buffer.from(candidate, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Creates a server-side session row and returns the token + its cookie options. */
function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query('INSERT INTO user_session (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [
    userId,
    tokenHash(token),
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
  await query('DELETE FROM user_session WHERE token_hash = $1', [tokenHash(token)]);
}

/** Reads the session cookie off a Next.js Request and resolves the account it belongs to. */
export async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { rows } = await query(
    `SELECT u.id AS user_id, u.email, u.role, u.admin_role
       FROM user_session s JOIN app_user u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'ACTIVE'`,
    [tokenHash(token)]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  await query('UPDATE user_session SET last_seen_at = now() WHERE token_hash = $1', [tokenHash(token)]).catch(() => {});
  return {
    token,
    accountId: row.user_id,
    email: row.email,
    role: row.role,
    learnerId: row.user_id,
    adminRole: row.admin_role,
  };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

// Compatibility adapter for the older learner-service APIs. The canonical
// authentication model is the account/session model above; these routes only
// need the learner id exposed as user.id.
export async function requireUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { rows } = await query(
    `SELECT u.id AS user_id, u.email, u.role, u.admin_role
       FROM user_session s JOIN app_user u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'ACTIVE'`,
    [tokenHash(token)]
  );
  if (!rows.length) return null;
  return { id: rows[0].user_id, accountId: rows[0].user_id, email: rows[0].email, role: rows[0].role, adminRole: rows[0].admin_role };
}

/** Resolves the learner id behind a request's session, or null if there isn't one (no session, or an admin account with no learner data). */
export async function requireLearnerId(request) {
  const session = await getSession(request);
  return session?.learnerId ?? null;
}

/** Resolves the session only if it belongs to an admin account, or null otherwise. The real authorization boundary for every /api/admin/* route -- never trust a client-side role check alone. */
export async function requireAdmin(request) {
  const session = await getSession(request);
  return session?.role === 'ADMIN' || session?.role === 'SUPER_ADMIN' ? session : null;
}

/**
 * Resolves the session only if it's an admin AND has the given permission
 * (see src/lib/permissions.mjs) -- a stricter gate than requireAdmin for
 * the handful of routes narrow enough to need one (user management, AI
 * config, publish/approve actions). Most admin routes still use
 * requireAdmin unchanged; this doesn't replace it everywhere, since this
 * app has one real admin today and retrofitting all ~60 admin routes to
 * granular permissions would be churn without a matching need yet.
 */
export async function requirePermission(request, permission) {
  const session = await getSession(request);
  return hasPermission(session, permission) ? session : null;
}

export function validateRegistration({ name, email, password }) {
  if (!name?.trim() || name.trim().length > 80) return 'Name is required and must be at most 80 characters.';
  if (!/^\S+@\S+\.\S+$/.test(email ?? '')) return 'Enter a valid email address.';
  if (password?.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long.';
  return null;
}
