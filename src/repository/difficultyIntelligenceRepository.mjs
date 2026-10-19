// Phase 26.6 — real aggregate attempt evidence for one question. hint_used
// (V8) and selected_index IS NULL meaning "skipped" (V1, both unchanged)
// make skip-rate and hint-rate real, not invented.
import { query } from '../lib/db.mjs';

export async function findPerformanceForQuestion(questionId, client = { query }) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS "attemptCount",
            COUNT(*) FILTER (WHERE correct)::int AS "correctCount",
            COUNT(*) FILTER (WHERE selected_index IS NULL)::int AS "skipCount",
            COUNT(*) FILTER (WHERE hint_used)::int AS "hintCount",
            AVG(time_taken_ms)::float8 AS "averageTimeTakenMs"
       FROM question_attempt
      WHERE question_id = $1`,
    [questionId]
  );
  return result.rows[0];
}
