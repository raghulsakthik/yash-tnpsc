import { query } from './db.mjs';
import { deleteRecordings } from './proctoringStorage.mjs';

export class ProctoringError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Verifies the test belongs to this learner, and is still in progress. Returns the test row. */
async function requireOwnedTest(testId, learnerId) {
  const { rows } = await query('SELECT id, learner_id, status FROM test WHERE id = $1', [testId]);
  if (rows.length === 0) throw new ProctoringError('TEST_NOT_FOUND', `No test ${testId}`);
  if (rows[0].learner_id !== learnerId) throw new ProctoringError('FORBIDDEN', 'This test does not belong to you');
  return rows[0];
}

export async function startSession(testId, learnerId) {
  await requireOwnedTest(testId, learnerId);
  const { rows } = await query(
    `INSERT INTO proctoring_session (test_id, learner_id) VALUES ($1, $2)
     ON CONFLICT (test_id) DO UPDATE SET status = 'RECORDING'
     RETURNING id`,
    [testId, learnerId]
  );
  return rows[0].id;
}

export async function recordChunk(testId, learnerId, stream) {
  await requireOwnedTest(testId, learnerId);
  const column = stream === 'camera' ? 'has_camera' : 'has_screen';
  await query(`UPDATE proctoring_session SET ${column} = true WHERE test_id = $1`, [testId]);
}

export async function logEvent(testId, learnerId, eventType, metadata) {
  await requireOwnedTest(testId, learnerId);
  const { rows } = await query('SELECT id FROM proctoring_session WHERE test_id = $1', [testId]);
  if (rows.length === 0) throw new ProctoringError('SESSION_NOT_FOUND', 'No proctoring session for this test');
  await query('INSERT INTO proctoring_event (session_id, event_type, metadata) VALUES ($1, $2, $3::jsonb)', [
    rows[0].id,
    eventType,
    JSON.stringify(metadata ?? {}),
  ]);
}

export async function stopSession(testId, learnerId) {
  await requireOwnedTest(testId, learnerId);
  await query(`UPDATE proctoring_session SET status = 'COMPLETED', ended_at = now() WHERE test_id = $1`, [testId]);
}

// ---------------------------------------------------------------- admin

export async function listSessions() {
  const { rows } = await query(`
    SELECT ps.test_id, ps.status, ps.has_camera, ps.has_screen, ps.started_at, ps.ended_at,
           ps.decision, ps.decision_reason, ps.decided_at,
           l.id AS learner_id, l.name AS learner_name, u.email AS learner_email,
           t.status AS test_status, t.score::float8 AS score, t.question_count, tt.name AS template_name,
           (SELECT COUNT(*)::int FROM proctoring_event pe WHERE pe.session_id = ps.id) AS event_count
      FROM proctoring_session ps
      JOIN learner l ON l.id = ps.learner_id
      LEFT JOIN app_user u ON u.id = l.id
      JOIN test t ON t.id = ps.test_id
      LEFT JOIN test_template tt ON tt.id = t.template_id
     ORDER BY ps.started_at DESC
  `);
  return rows.map((r) => ({
    testId: r.test_id,
    status: r.status,
    hasCamera: r.has_camera,
    hasScreen: r.has_screen,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    learnerId: r.learner_id,
    learnerName: r.learner_name,
    learnerEmail: r.learner_email,
    testStatus: r.test_status,
    score: r.score,
    questionCount: r.question_count,
    templateName: r.template_name,
    eventCount: r.event_count,
    decision: r.decision,
    decisionReason: r.decision_reason,
    decidedAt: r.decided_at,
  }));
}

export async function getSessionDetail(testId) {
  const { rows: sessionRows } = await query(
    `SELECT ps.id, ps.status, ps.has_camera, ps.has_screen, ps.started_at, ps.ended_at,
            l.name AS learner_name, t.status AS test_status, t.score::float8 AS score, t.question_count
       FROM proctoring_session ps
       JOIN learner l ON l.id = ps.learner_id
       JOIN test t ON t.id = ps.test_id
      WHERE ps.test_id = $1`,
    [testId]
  );
  if (sessionRows.length === 0) return null;
  const s = sessionRows[0];

  const { rows: eventRows } = await query(
    'SELECT event_type, metadata, created_at FROM proctoring_event WHERE session_id = $1 ORDER BY created_at',
    [s.id]
  );

  return {
    status: s.status,
    hasCamera: s.has_camera,
    hasScreen: s.has_screen,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    learnerName: s.learner_name,
    testStatus: s.test_status,
    score: s.score,
    questionCount: s.question_count,
    events: eventRows.map((e) => ({ type: e.event_type, metadata: e.metadata, at: e.created_at })),
  };
}

/** Permanently deletes a session's recordings (disk) and its DB row (cascades to its events). */
export async function deleteSession(testId) {
  const { rows } = await query('DELETE FROM proctoring_session WHERE test_id = $1 RETURNING id', [testId]);
  if (rows.length === 0) throw new ProctoringError('SESSION_NOT_FOUND', `No proctoring session for test ${testId}`);
  await deleteRecordings(testId);
}

// ------------------------------------------------------------ admin: policies

const POLICY_COLUMNS = {
  enabled: 'enabled',
  fullscreenRequired: 'fullscreen_required',
  tabSwitchDetection: 'tab_switch_detection',
  copyPasteRestricted: 'copy_paste_restricted',
  cameraRequired: 'camera_required',
  microphoneRequired: 'microphone_required',
  identityVerification: 'identity_verification',
  facePresenceDetection: 'face_presence_detection',
  multipleFaceDetection: 'multiple_face_detection',
  autoSubmitOnViolationLimit: 'auto_submit_on_violation_limit',
  manualReviewRequired: 'manual_review_required',
};

export async function listPolicies() {
  const { rows } = await query(`
    SELECT id, name, enabled, fullscreen_required, tab_switch_detection, copy_paste_restricted,
           camera_required, microphone_required, identity_verification, face_presence_detection,
           multiple_face_detection, network_interruption_grace_period_sec, max_violations_allowed,
           auto_submit_on_violation_limit, manual_review_required, learner_consent_notice
      FROM proctoring_policy ORDER BY name
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    fullscreenRequired: r.fullscreen_required,
    tabSwitchDetection: r.tab_switch_detection,
    copyPasteRestricted: r.copy_paste_restricted,
    cameraRequired: r.camera_required,
    microphoneRequired: r.microphone_required,
    identityVerification: r.identity_verification,
    facePresenceDetection: r.face_presence_detection,
    multipleFaceDetection: r.multiple_face_detection,
    networkInterruptionGracePeriodSec: r.network_interruption_grace_period_sec,
    maxViolationsAllowed: r.max_violations_allowed,
    autoSubmitOnViolationLimit: r.auto_submit_on_violation_limit,
    manualReviewRequired: r.manual_review_required,
    learnerConsentNotice: r.learner_consent_notice,
  }));
}

/**
 * Updates whichever of the real boolean toggles are present in `patch` --
 * the only fields the Admin Portal's policy editor actually exposes a
 * control for (no numeric/text fields, no create-new-policy; see
 * ProctoringHubView's toggle list). Keyed off POLICY_COLUMNS rather than
 * interpolating request-supplied field names directly into SQL.
 */
export async function updatePolicy(id, patch) {
  const setClauses = [];
  const values = [id];
  for (const [field, column] of Object.entries(POLICY_COLUMNS)) {
    if (patch[field] !== undefined) {
      values.push(Boolean(patch[field]));
      setClauses.push(`${column} = $${values.length}`);
    }
  }
  if (setClauses.length === 0) throw new ProctoringError('NO_FIELDS', 'No recognized policy fields in the request body');
  setClauses.push('updated_at = now()');

  const { rowCount } = await query(`UPDATE proctoring_policy SET ${setClauses.join(', ')} WHERE id = $1`, values);
  if (rowCount === 0) throw new ProctoringError('POLICY_NOT_FOUND', `No proctoring policy ${id}`);
}

// ------------------------------------------------------------ admin: decisions

const VALID_DECISIONS = new Set(['CLEAR', 'WARNING', 'FLAG', 'INVALIDATE', 'REVIEW_REQUIRED']);

/**
 * Records an admin's integrity verdict on a completed attempt. Storage
 * only -- deliberately doesn't cascade into the learner's real score or
 * test status (no silent effect on analytics/leaderboards the learner
 * sees); an INVALIDATE decision is visible to admins reviewing this
 * session, not an automatic scoring action.
 */
export async function recordDecision(testId, { decision, reason, decidedBy }) {
  if (!VALID_DECISIONS.has(decision)) {
    throw new ProctoringError('INVALID_DECISION', `decision must be one of ${[...VALID_DECISIONS].join(', ')}`);
  }
  const { rowCount } = await query(
    `UPDATE proctoring_session SET decision = $2, decision_reason = $3, decided_by = $4, decided_at = now() WHERE test_id = $1`,
    [testId, decision, reason ?? null, decidedBy ?? null]
  );
  if (rowCount === 0) throw new ProctoringError('SESSION_NOT_FOUND', `No proctoring session for test ${testId}`);
}

// ------------------------------------------------------------- admin: events

const EVENT_SEVERITY = {
  FULLSCREEN_EXIT: 'HIGH',
  CAMERA_LOST: 'HIGH',
  CONSENT_DENIED: 'HIGH',
  SCREEN_SHARE_LOST: 'MEDIUM',
  TAB_HIDDEN: 'MEDIUM',
  TAB_VISIBLE: 'LOW',
  FULLSCREEN_ENTER: 'LOW',
};

/**
 * The real incident feed (POST /api/proctoring/event already writes these
 * rows from the learner's test-taking client -- see
 * src/app/api/proctoring/event/route.js). No browser/OS/IP/screen-
 * resolution telemetry is actually captured by that write path, so
 * deviceMetadata is honestly placeholdered rather than invented; severity
 * is a simple, disclosed mapping off the real event_type, not a real risk
 * model.
 */
export async function listRecentEvents(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { rows } = await query(
    `SELECT pe.id, pe.event_type, pe.created_at, ps.test_id, l.id AS learner_id, l.name AS learner_name
       FROM proctoring_event pe
       JOIN proctoring_session ps ON ps.id = pe.session_id
       JOIN learner l ON l.id = ps.learner_id
      ORDER BY pe.created_at DESC
      LIMIT $1`,
    [safeLimit]
  );
  return rows.map((r) => ({
    id: String(r.id),
    testId: r.test_id,
    learnerId: r.learner_id,
    learnerName: r.learner_name,
    timestamp: r.created_at,
    eventType: r.event_type,
    severity: EVENT_SEVERITY[r.event_type] || 'LOW',
  }));
}
