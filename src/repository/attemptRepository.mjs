// Phase 2 — read-side repository for `question_attempt`, under the domain
// name "LearningAttempt". Writes to this table continue to go exclusively
// through src/lib/attempts.mjs's recordAttempt() — that pipeline is tested,
// working, and shared by practice/revision/mistakes/test-submit, and Phase 2
// does not touch it. This repository only adds a read surface for the new
// domain/service layer (e.g. listing a learner's attempts for a session).
import { query } from '../lib/db.mjs';

export async function findAttemptById(id, client = { query }) {
  const result = await client.query(
    `SELECT id, learner_id, question_id, topic_id, selected_index, correct,
       time_taken_ms, confidence, mistake_type, session_id, created_at
     FROM question_attempt WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findAttemptsForSession(sessionId, client = { query }) {
  const result = await client.query(
    `SELECT id, learner_id, question_id, topic_id, selected_index, correct,
       time_taken_ms, confidence, mistake_type, session_id, created_at
     FROM question_attempt WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows;
}
