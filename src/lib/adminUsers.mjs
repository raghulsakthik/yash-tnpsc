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
