// Phase 19 — reads for the Aptitude Assessment Layer's analysis step. Reads
// the existing `test`/`test_question`/`test_answer` tables (V5, unchanged)
// exactly as they already are — no new schema, and the weekly test's own
// create/answer/submit routes are not touched.
import { query } from '../lib/db.mjs';

export async function findCompletedTest(testId, client = { query }) {
  const result = await client.query(
    `SELECT id, learner_id, status, question_count, score::float8 AS score, started_at, completed_at
       FROM test WHERE id = $1`,
    [testId]
  );
  return result.rows[0] ?? null;
}

// Every question on the test plus whatever she answered — correctness is
// computed by the service by comparing selected_index to answer_index
// directly (the same comparison the submit route already does), not
// re-derived from question_attempt (which carries no link back to which
// test produced it).
export async function findTestQuestionsWithAnswers(testId, client = { query }) {
  const result = await client.query(
    `SELECT q.id AS question_id, q.topic_id, t.name AS topic_name, q.difficulty::float8 AS difficulty,
            q.estimated_seconds, q.answer_index,
            ta.selected_index, ta.time_taken_ms
       FROM test_question tq
       JOIN question q ON q.id = tq.question_id
       JOIN topic t ON t.id = q.topic_id
       LEFT JOIN test_answer ta ON ta.test_id = tq.test_id AND ta.question_id = tq.question_id
      WHERE tq.test_id = $1
      ORDER BY tq.order_index`,
    [testId]
  );
  return result.rows;
}
