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
           l.name AS learner_name, t.status AS test_status, t.score::float8 AS score, t.question_count,
           (SELECT COUNT(*)::int FROM proctoring_event pe WHERE pe.session_id = ps.id) AS event_count
      FROM proctoring_session ps
      JOIN learner l ON l.id = ps.learner_id
      JOIN test t ON t.id = ps.test_id
     ORDER BY ps.started_at DESC
  `);
  return rows.map((r) => ({
    testId: r.test_id,
    status: r.status,
    hasCamera: r.has_camera,
    hasScreen: r.has_screen,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    learnerName: r.learner_name,
    testStatus: r.test_status,
    score: r.score,
    questionCount: r.question_count,
    eventCount: r.event_count,
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
