import crypto from 'crypto';
import { query } from './db.mjs';
import { hashPassword } from './auth.mjs';
import { ADMIN_ROLE_LABELS } from './permissions.mjs';

export class AdminUserError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const VALID_ADMIN_ROLES = new Set(Object.keys(ADMIN_ROLE_LABELS));

/** Every admin user, with its subject scope. Canonical identity is app_user.id. */
export async function listAdminAccounts() {
  const { rows } = await query(`
    SELECT u.id, u.email, u.admin_role, u.created_at,
           COALESCE(array_agg(s.subject_id) FILTER (WHERE s.subject_id IS NOT NULL), '{}') AS subject_ids
      FROM app_user u
      LEFT JOIN admin_subject_scope s ON s.user_id = u.id
     WHERE u.role IN ('ADMIN','SUPER_ADMIN')
     GROUP BY u.id
     ORDER BY u.created_at ASC
  `);
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    adminRole: r.admin_role,
    adminRoleLabel: ADMIN_ROLE_LABELS[r.admin_role] ?? r.admin_role,
    subjectIds: r.subject_ids,
    createdAt: r.created_at,
  }));
}

/** Creates a canonical admin user with granular role and optional subject scope. */
export async function createAdminAccount({ email, password, adminRole, subjectIds = [] }) {
  if (!email || !password || password.length < 8) {
    throw new AdminUserError('MISSING_FIELDS', 'email and a password of at least 8 characters are required');
  }
  if (!VALID_ADMIN_ROLES.has(adminRole)) {
    throw new AdminUserError('INVALID_ROLE', `adminRole must be one of: ${[...VALID_ADMIN_ROLES].join(', ')}`);
  }

  const { rows: existing } = await query('SELECT id FROM app_user WHERE lower(email) = lower($1)', [email]);
  if (existing.length > 0) throw new AdminUserError('EMAIL_TAKEN', `${email} already has an account`);

  const passwordHash = hashPassword(password);
  const { rows } = await query(
    `INSERT INTO learner (name) VALUES ($1) RETURNING id`,
    [email]
  );
  const userId = rows[0].id;
  await query(
    `INSERT INTO learner_profile (learner_id) VALUES ($1) ON CONFLICT (learner_id) DO NOTHING`,
    [userId]
  );
  await query(
    `INSERT INTO app_user (id, email, password_hash, role, admin_role) VALUES ($1, $2, $3, 'ADMIN', $4)`,
    [userId, email, passwordHash, adminRole]
  );

  if (adminRole === 'subject_expert' && subjectIds.length > 0) {
    await setSubjectScope(userId, subjectIds);
  }
  return userId;
}

/** Changes an existing admin's granular role and/or subject scope. */
export async function updateAdminAccount(userId, { adminRole, subjectIds }) {
  const { rows } = await query(
    `SELECT id, admin_role FROM app_user WHERE id = $1 AND role IN ('ADMIN','SUPER_ADMIN')`,
    [userId]
  );
  if (rows.length === 0) throw new AdminUserError('ACCOUNT_NOT_FOUND', `No admin account ${userId}`);

  if (adminRole !== undefined) {
    if (!VALID_ADMIN_ROLES.has(adminRole)) {
      throw new AdminUserError('INVALID_ROLE', `adminRole must be one of: ${[...VALID_ADMIN_ROLES].join(', ')}`);
    }
    await query('UPDATE app_user SET admin_role = $2, role = $3 WHERE id = $1', [userId, adminRole, adminRole === 'super_admin' ? 'SUPER_ADMIN' : 'ADMIN']);
  }
  if (subjectIds !== undefined) await setSubjectScope(userId, subjectIds);
}

async function setSubjectScope(userId, subjectIds) {
  await query('DELETE FROM admin_subject_scope WHERE user_id = $1', [userId]);
  for (const subjectId of subjectIds) {
    await query(
      `INSERT INTO admin_subject_scope (user_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, subjectId]
    );
  }
}

/** Removes an admin user entirely, except the currently authenticated user. */
export async function deleteAdminAccount(userId, { requestingAccountId }) {
  if (userId === requestingAccountId) {
    throw new AdminUserError('CANNOT_DELETE_SELF', 'You cannot delete your own account while signed in as it.');
  }
  const { rowCount } = await query(
    `DELETE FROM app_user WHERE id = $1 AND role IN ('ADMIN','SUPER_ADMIN')`,
    [userId]
  );
  if (rowCount === 0) throw new AdminUserError('ACCOUNT_NOT_FOUND', `No admin account ${userId}`);
}

/**
 * Finds a learner (role = 'STUDENT') by exact email, for admin lookup
 * before deletion -- there's no general learner list/search surface yet,
 * so email is the only practical way an admin identifies one account
 * among potentially many thousands.
 */
export async function findLearnerByEmail(email) {
  if (!email) return null;
  const { rows } = await query(
    `SELECT u.id, u.email, u.created_at, l.name
       FROM app_user u JOIN learner l ON l.id = u.id
      WHERE u.role = 'STUDENT' AND lower(u.email) = lower($1)`,
    [email]
  );
  return rows[0] ?? null;
}

/**
 * Finds learners whose email starts with the given prefix -- the practical
 * way to find a batch of disposable test/QA accounts afterwards (they're
 * typically registered with a shared, deterministic prefix like
 * "android-verify-") when their individual emails were never recorded.
 * Capped at 50 so this can't become an unbounded roster dump.
 */
export async function findLearnersByEmailPrefix(prefix) {
  if (!prefix) return [];
  const { rows } = await query(
    `SELECT u.id, u.email, u.created_at, l.name
       FROM app_user u JOIN learner l ON l.id = u.id
      WHERE u.role = 'STUDENT' AND u.email ILIKE $1 || '%'
      ORDER BY u.created_at DESC
      LIMIT 50`,
    [prefix.replace(/[%_\\]/g, (c) => `\\${c}`)]
  );
  return rows;
}

/**
 * Permanently deletes a learner account and everything tied to it
 * (attempts, bookmarks, notes, sessions, ...) by deleting the root
 * `learner` row -- app_user and every other learner-owned table reference
 * it with ON DELETE CASCADE, except content_report.reviewed_by (an admin
 * audit field, nullable, no cascade by design) which is cleared first so
 * the delete can't fail on an FK violation. Scoped to role = 'STUDENT'
 * only: deleting an admin account is deleteAdminAccount's job, not this
 * one's, so an admin can't be removed through the learner-cleanup path by
 * mistake.
 */
export async function deleteLearnerAccount(learnerId) {
  const { rows } = await query(`SELECT id FROM app_user WHERE id = $1 AND role = 'STUDENT'`, [learnerId]);
  if (rows.length === 0) throw new AdminUserError('ACCOUNT_NOT_FOUND', `No learner account ${learnerId}`);

  await query(`UPDATE content_report SET reviewed_by = NULL WHERE reviewed_by = $1`, [learnerId]);
  const { rowCount } = await query(`DELETE FROM learner WHERE id = $1`, [learnerId]);
  if (rowCount === 0) throw new AdminUserError('ACCOUNT_NOT_FOUND', `No learner account ${learnerId}`);
}

/**
 * The real learner roster for the Admin Portal's Learners section --
 * previously this section was seeded entirely from mockAdminData into
 * localStorage, never touching the database. Deliberately keeps the
 * per-row stats cheap and bulk-safe (a handful of COUNT/AVG aggregates
 * joined once for the whole page, not one query per learner): xp/level/
 * streak/weak-topics/strong-topics stay at an honest zero/empty rather
 * than approximating them, since computing those correctly in bulk (spaced
 * repetition state, mastery per topic) is real per-learner work the
 * learner-facing /api/profile and /api/learning/analytics routes already
 * do one row at a time -- faking a cheaper bulk version would just be a
 * different kind of wrong number.
 */
export async function listLearners({ search, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const params = [];
  let whereClause = `u.role = 'STUDENT'`;
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    whereClause += ` AND (l.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS n FROM app_user u JOIN learner l ON l.id = u.id WHERE ${whereClause}`, params);

  params.push(safeLimit, safeOffset);
  const { rows } = await query(
    `SELECT u.id, l.name, u.email, lp.phone, u.status, u.suspension_reason, u.created_at, u.last_login_at,
            COALESCE(attempt_stats.total, 0) AS attempts_total,
            COALESCE(attempt_stats.correct, 0) AS attempts_correct,
            COALESCE(test_stats.n, 0) AS tests_completed,
            COALESCE(unit_stats.n, 0) AS completed_units
       FROM app_user u
       JOIN learner l ON l.id = u.id
       LEFT JOIN learner_profile lp ON lp.learner_id = u.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE correct)::int AS correct
           FROM question_attempt a WHERE a.learner_id = u.id
       ) attempt_stats ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS n FROM test t WHERE t.learner_id = u.id AND t.status = 'COMPLETED'
       ) test_stats ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS n FROM learner_unit_progress p WHERE p.learner_id = u.id AND p.status = 'COMPLETED'
       ) unit_stats ON true
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    total: countRows[0]?.n ?? 0,
    learners: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      accountStatus: r.status,
      suspensionReason: r.suspension_reason,
      createdAt: r.created_at,
      lastActive: r.last_login_at,
      testsAttempted: Number(r.tests_completed),
      completedLessons: Number(r.completed_units),
      accuracyRate: Number(r.attempts_total) > 0 ? Math.round((Number(r.attempts_correct) / Number(r.attempts_total)) * 100) : 0,
    })),
  };
}

/**
 * Suspend or reactivate a learner account. Scoped to role = 'STUDENT' for
 * the same reason deleteLearnerAccount is -- this must never be able to
 * touch an admin account.
 */
export async function updateLearnerStatus(learnerId, status, reason) {
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    throw new AdminUserError('INVALID_STATUS', "status must be 'ACTIVE' or 'SUSPENDED'");
  }
  const { rowCount } = await query(
    `UPDATE app_user SET status = $2, suspension_reason = $3, updated_at = now() WHERE id = $1 AND role = 'STUDENT'`,
    [learnerId, status, status === 'SUSPENDED' ? (reason || null) : null]
  );
  if (rowCount === 0) throw new AdminUserError('ACCOUNT_NOT_FOUND', `No learner account ${learnerId}`);
}

/**
 * Admin-created learner account -- the Add Learner modal in the Admin
 * Portal, previously a local-only row. Generates a random temporary
 * password (shown once in the response, never stored in plaintext) rather
 * than requiring the admin to invent one; there's no email-delivery path
 * for account creation yet, so the admin is expected to relay it directly.
 */
export async function createLearnerAccount({ name, email, phone }) {
  if (!name || !email) {
    throw new AdminUserError('MISSING_FIELDS', 'name and email are required');
  }
  const { rows: existing } = await query('SELECT id FROM app_user WHERE lower(email) = lower($1)', [email]);
  if (existing.length > 0) throw new AdminUserError('EMAIL_TAKEN', `${email} already has an account`);

  const tempPassword = crypto.randomBytes(9).toString('base64url');
  const passwordHash = hashPassword(tempPassword);

  const { rows } = await query(`INSERT INTO learner (name) VALUES ($1) RETURNING id`, [name]);
  const learnerId = rows[0].id;
  await query(`INSERT INTO learner_profile (learner_id, phone) VALUES ($1, $2) ON CONFLICT (learner_id) DO NOTHING`, [learnerId, phone || null]);
  await query(
    `INSERT INTO app_user (id, email, password_hash, role, status, email_verified) VALUES ($1, $2, $3, 'STUDENT', 'ACTIVE', false)`,
    [learnerId, email, passwordHash]
  );

  return { id: learnerId, tempPassword };
}
