import { query } from './db.mjs';

/**
 * Permission strings, grouped by the resource they govern. Matches the
 * content-intelligence spec's naming (resource.action) rather than
 * inventing a parallel scheme. `support.*` is this app's own addition --
 * the spec's review.* pair doesn't cover the report/resolve flow.
 */
export const PERMISSIONS = Object.freeze({
  CONTENT_CREATE: 'content.create',
  CONTENT_READ: 'content.read',
  CONTENT_UPDATE: 'content.update',
  CONTENT_DELETE: 'content.delete',
  CONTENT_PUBLISH: 'content.publish',
  QUESTION_CREATE: 'question.create',
  QUESTION_READ: 'question.read',
  QUESTION_UPDATE: 'question.update',
  QUESTION_DELETE: 'question.delete',
  QUESTION_PUBLISH: 'question.publish',
  TOPIC_CREATE: 'topic.create',
  TOPIC_UPDATE: 'topic.update',
  TOPIC_MERGE: 'topic.merge',
  TOPIC_DELETE: 'topic.delete',
  REVIEW_CONTENT: 'review.content',
  REVIEW_QUESTION: 'review.question',
  AI_CLASSIFY: 'ai.classify',
  AI_GENERATE: 'ai.generate',
  AI_CONFIGURE: 'ai.configure',
  ANALYTICS_READ: 'analytics.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  AUDIT_READ: 'audit.read',
  SUPPORT_READ: 'support.read',
  SUPPORT_RESOLVE: 'support.resolve',
});

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// Permissions in this set are subject-scoped for SUBJECT_EXPERT: that role
// only has them for subjects in its admin_subject_scope rows, never
// platform-wide. Every other role's permissions here are unconditional.
const SUBJECT_SCOPABLE = new Set([
  PERMISSIONS.CONTENT_CREATE, PERMISSIONS.CONTENT_UPDATE,
  PERMISSIONS.QUESTION_CREATE, PERMISSIONS.QUESTION_UPDATE,
  PERMISSIONS.TOPIC_UPDATE,
]);

/**
 * One row per admin_role. super_admin is handled specially (everything,
 * no scoping) rather than listed here -- see hasPermission.
 */
export const ROLE_PERMISSIONS = Object.freeze({
  platform_admin: [
    PERMISSIONS.CONTENT_CREATE, PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_UPDATE, PERMISSIONS.CONTENT_DELETE, PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.QUESTION_CREATE, PERMISSIONS.QUESTION_READ, PERMISSIONS.QUESTION_UPDATE, PERMISSIONS.QUESTION_DELETE, PERMISSIONS.QUESTION_PUBLISH,
    PERMISSIONS.TOPIC_CREATE, PERMISSIONS.TOPIC_UPDATE, PERMISSIONS.TOPIC_MERGE, PERMISSIONS.TOPIC_DELETE,
    PERMISSIONS.REVIEW_CONTENT, PERMISSIONS.REVIEW_QUESTION,
    PERMISSIONS.AI_CLASSIFY, PERMISSIONS.AI_GENERATE,
    PERMISSIONS.ANALYTICS_READ, PERMISSIONS.SUPPORT_READ, PERMISSIONS.SUPPORT_RESOLVE,
  ],
  content_admin: [
    PERMISSIONS.CONTENT_CREATE, PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_UPDATE, PERMISSIONS.CONTENT_DELETE, PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.TOPIC_CREATE, PERMISSIONS.TOPIC_UPDATE, PERMISSIONS.TOPIC_MERGE, PERMISSIONS.TOPIC_DELETE,
    PERMISSIONS.REVIEW_CONTENT, PERMISSIONS.AI_CLASSIFY,
  ],
  question_bank_admin: [
    PERMISSIONS.QUESTION_CREATE, PERMISSIONS.QUESTION_READ, PERMISSIONS.QUESTION_UPDATE, PERMISSIONS.QUESTION_DELETE, PERMISSIONS.QUESTION_PUBLISH,
    PERMISSIONS.REVIEW_QUESTION, PERMISSIONS.AI_CLASSIFY, PERMISSIONS.AI_GENERATE,
  ],
  subject_expert: [
    PERMISSIONS.CONTENT_CREATE, PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.QUESTION_CREATE, PERMISSIONS.QUESTION_READ, PERMISSIONS.QUESTION_UPDATE,
    PERMISSIONS.TOPIC_UPDATE,
  ],
  question_reviewer: [
    PERMISSIONS.QUESTION_READ, PERMISSIONS.QUESTION_UPDATE, PERMISSIONS.REVIEW_QUESTION,
  ],
  content_reviewer: [
    PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_UPDATE, PERMISSIONS.REVIEW_CONTENT,
  ],
  ai_quality_admin: [
    PERMISSIONS.AI_CLASSIFY, PERMISSIONS.AI_GENERATE, PERMISSIONS.AI_CONFIGURE,
    PERMISSIONS.REVIEW_CONTENT, PERMISSIONS.REVIEW_QUESTION,
  ],
  student_support_admin: [
    PERMISSIONS.SUPPORT_READ, PERMISSIONS.SUPPORT_RESOLVE, PERMISSIONS.QUESTION_READ, PERMISSIONS.QUESTION_UPDATE,
  ],
  analytics_admin: [
    PERMISSIONS.ANALYTICS_READ,
  ],
  auditor: [
    PERMISSIONS.AUDIT_READ, PERMISSIONS.ANALYTICS_READ, PERMISSIONS.CONTENT_READ, PERMISSIONS.QUESTION_READ,
  ],
});

export const ADMIN_ROLE_LABELS = Object.freeze({
  super_admin: 'Super Admin',
  platform_admin: 'Platform Admin',
  content_admin: 'Content Admin',
  question_bank_admin: 'Question Bank Admin',
  subject_expert: 'Subject Expert',
  question_reviewer: 'Question Reviewer',
  content_reviewer: 'Content Reviewer',
  ai_quality_admin: 'AI Quality Admin',
  student_support_admin: 'Student Support Admin',
  analytics_admin: 'Analytics Admin',
  auditor: 'Auditor',
});

/**
 * @param {{role: string, adminRole: string|null}} session
 * @param {string} permission one of PERMISSIONS' values
 * @returns {boolean}
 */
export function hasPermission(session, permission) {
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) return false;
  if (session.adminRole === 'super_admin') return true;
  const granted = ROLE_PERMISSIONS[session.adminRole] ?? [];
  return granted.includes(permission);
}

/** Whether `permission` is scoped to specific subjects for this session's role (true for subject_expert on a scopable permission). */
export function isSubjectScoped(session, permission) {
  return session?.adminRole === 'subject_expert' && SUBJECT_SCOPABLE.has(permission);
}

/** The subject ids a subject_expert account may act on. Irrelevant (and not called) for any other role. */
export async function getSubjectScope(accountId) {
  const { rows } = await query('SELECT subject_id FROM admin_subject_scope WHERE account_id = $1', [accountId]);
  return rows.map((r) => r.subject_id);
}

/**
 * Full authorization check for one subject-scoped action: has the
 * permission at all, and (if their role is subject-scoped for it) the
 * specific subject is in their assigned scope.
 */
export async function canActOnSubject(session, permission, subjectId) {
  if (!hasPermission(session, permission)) return false;
  if (!isSubjectScoped(session, permission)) return true;
  if (!subjectId) return false;
  const scope = await getSubjectScope(session.accountId);
  return scope.includes(subjectId);
}


/** Resolve a topic's subject and enforce subject_expert scope for a topic action. */
export async function canActOnTopic(session, permission, topicId) {
  if (!hasPermission(session, permission)) return false;
  if (!isSubjectScoped(session, permission)) return true;
  if (!topicId) return false;
  const { rows } = await query(
    `SELECT c.subject_id FROM topic t JOIN chapter c ON c.id = t.chapter_id WHERE t.id = $1`,
    [topicId]
  );
  return rows.length > 0 && canActOnSubject(session, permission, rows[0].subject_id);
}

export { ALL_PERMISSIONS };
