// Phase 2 — repository for the new `learning_session` table (V6), and the
// optional `session_id` link on `question_attempt` added in the same
// migration. Existing attempt-writing code (src/lib/attempts.mjs) does not
// set this column and keeps working exactly as before — it stays null there.
import { query } from '../lib/db.mjs';

export async function createLearningSession(
  { learnerId, topicId = null, sessionType, status = 'IN_PROGRESS', metadata = {} },
  client = { query }
) {
  const result = await client.query(
    `INSERT INTO learning_session (learner_id, topic_id, session_type, status, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, learner_id, topic_id, session_type, status, started_at, completed_at, metadata`,
    [learnerId, topicId, sessionType, status, metadata]
  );
  return result.rows[0];
}

export async function completeLearningSession(id, client = { query }) {
  const result = await client.query(
    `UPDATE learning_session SET status = 'COMPLETED', completed_at = now() WHERE id = $1
     RETURNING id, learner_id, topic_id, session_type, status, started_at, completed_at, metadata`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findLearningSessionById(id, client = { query }) {
  const result = await client.query(
    `SELECT id, learner_id, topic_id, session_type, status, started_at, completed_at, metadata
     FROM learning_session WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function attachAttemptToSession(attemptId, sessionId, client = { query }) {
  await client.query('UPDATE question_attempt SET session_id = $2 WHERE id = $1', [attemptId, sessionId]);
}
