// Phase 28.3 — the one real previous value "why did the score change"
// needs to diff against.
import { query } from '../lib/db.mjs';

export async function findLatestReadinessSnapshot(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT overall_score::float8 AS overall_score, breakdown, computed_at
       FROM readiness_snapshot WHERE learner_id = $1 ORDER BY computed_at DESC LIMIT 1`,
    [learnerId]
  );
  return result.rows[0] ?? null;
}

export async function insertReadinessSnapshot({ learnerId, overallScore, breakdown }, client = { query }) {
  const result = await client.query(
    `INSERT INTO readiness_snapshot (learner_id, overall_score, breakdown) VALUES ($1, $2, $3::jsonb) RETURNING computed_at`,
    [learnerId, overallScore, JSON.stringify(breakdown)]
  );
  return result.rows[0];
}
