// Phase 17 — the facts MilestoneEvaluator needs, read from the real event
// stream (learning_event) where a precise discrete event exists, or the
// authoritative question_attempt/question tables directly where that's the
// more precise source. No new tracking mechanism; see milestone.mjs.
import { query } from '../lib/db.mjs';

export async function findFirstTestCompletionEvent(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT created_at FROM learning_event
      WHERE learner_id = $1 AND event IN ('TEST_COMPLETED', 'DEFAULT_ASSESSMENT_COMPLETED')
      ORDER BY created_at ASC LIMIT 1`,
    [learnerId]
  );
  return result.rows[0]?.created_at ?? null;
}

export async function countQuestionAttempts(learnerId, client = { query }) {
  const result = await client.query('SELECT COUNT(*)::int AS n FROM question_attempt WHERE learner_id = $1', [learnerId]);
  return result.rows[0].n;
}

export async function findNthAttemptTimestamp(learnerId, n, client = { query }) {
  const result = await client.query(
    'SELECT created_at FROM question_attempt WHERE learner_id = $1 ORDER BY created_at ASC OFFSET $2 LIMIT 1',
    [learnerId, n - 1]
  );
  return result.rows[0]?.created_at ?? null;
}

export async function findDistinctActivityDates(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::date AS day FROM question_attempt WHERE learner_id = $1`,
    [learnerId]
  );
  // src/lib/db.mjs installs a real type-parser override for DATE columns
  // (OID 1082) that keeps every ::date-cast query result as a plain
  // 'YYYY-MM-DD' string instead of a JS Date anchored at local midnight —
  // a real, deliberate fix for a timezone bug (that conversion silently
  // shifts a date back a day in any positive-UTC-offset timezone). `r.day`
  // is already in that format; no further conversion needed.
  return result.rows.map((r) => r.day);
}

export async function findFirstPyqAttemptTimestamp(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT qa.created_at FROM question_attempt qa JOIN question q ON q.id = qa.question_id
      WHERE qa.learner_id = $1 AND q.source LIKE 'tnpsc-%'
      ORDER BY qa.created_at ASC LIMIT 1`,
    [learnerId]
  );
  return result.rows[0]?.created_at ?? null;
}
