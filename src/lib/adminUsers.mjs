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

/** Every admin account, with its subject scope (only meaningful for subject_expert). */
export async function listAdminAccounts() {
  const { rows } = await query(`
    SELECT a.id, a.email, a.admin_role, a.created_at,
           COALESCE(array_agg(s.subject_id) FILTER (WHERE s.subject_id IS NOT NULL), '{}') AS subject_ids
      FROM account a
      LEFT JOIN admin_subject_scope s ON s.account_id = a.id
     WHERE a.role = 'admin'
     GROUP BY a.id
     ORDER BY a.created_at ASC
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

/** Creates a new admin account with a specific granular role (and, for subject_expert, a subject scope). */
export async function createAdminAccount({ email, password, adminRole, subjectIds = [] }) {
  if (!email || !password || password.length < 8) {
    throw new AdminUserError('MISSING_FIELDS', 'email and a password of at least 8 characters are required');
  }
  if (!VALID_ADMIN_ROLES.has(adminRole)) {
    throw new AdminUserError('INVALID_ROLE', `adminRole must be one of: ${[...VALID_ADMIN_ROLES].join(', ')}`);
  }

  const { rows: existing } = await query('SELECT id FROM account WHERE email = $1', [email]);
  if (existing.length > 0) throw new AdminUserError('EMAIL_TAKEN', `${email} already has an account`);

  const passwordHash = hashPassword(password);
  const { rows } = await query(
    `INSERT INTO account (email, password_hash, role, learner_id, admin_role) VALUES ($1, $2, 'admin', NULL, $3) RETURNING id`,
    [email, passwordHash, adminRole]
  );
  const accountId = rows[0].id;

  if (adminRole === 'subject_expert' && subjectIds.length > 0) {
    await setSubjectScope(accountId, subjectIds);
  }

  return accountId;
}

/** Changes an existing admin's granular role and/or subject scope. Never touches email/password. */
export async function updateAdminAccount(accountId, { adminRole, subjectIds }) {
  const { rows } = await query(`SELECT id, admin_role FROM account WHERE id = $1 AND role = 'admin'`, [accountId]);
  if (rows.length === 0) throw new AdminUserError('ACCOUNT_NOT_FOUND', `No admin account ${accountId}`);

  if (adminRole !== undefined) {
    if (!VALID_ADMIN_ROLES.has(adminRole)) {
      throw new AdminUserError('INVALID_ROLE', `adminRole must be one of: ${[...VALID_ADMIN_ROLES].join(', ')}`);
    }
    await query('UPDATE account SET admin_role = $2 WHERE id = $1', [accountId, adminRole]);
  }

  if (subjectIds !== undefined) {
    await setSubjectScope(accountId, subjectIds);
  }
}

async function setSubjectScope(accountId, subjectIds) {
  await query('DELETE FROM admin_subject_scope WHERE account_id = $1', [accountId]);
  for (const subjectId of subjectIds) {
    await query(
      `INSERT INTO admin_subject_scope (account_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [accountId, subjectId]
    );
  }
}

/** Removes an admin account entirely (not a learner/test account -- those are a different lifecycle). */
export async function deleteAdminAccount(accountId, { requestingAccountId }) {
  if (accountId === requestingAccountId) {
    throw new AdminUserError('CANNOT_DELETE_SELF', 'You cannot delete your own account while signed in as it.');
  }
  const { rowCount } = await query(`DELETE FROM account WHERE id = $1 AND role = 'admin'`, [accountId]);
  if (rowCount === 0) throw new AdminUserError('ACCOUNT_NOT_FOUND', `No admin account ${accountId}`);
}
