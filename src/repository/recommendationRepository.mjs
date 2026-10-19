// Phase 27.5/27.6 — the `recommendation` table (V14). A scored Next Best
// Action becomes a real, trackable row the moment it's surfaced.
import { query } from '../lib/db.mjs';

const COLUMNS =
  'id, learner_id, action, target_topic_id, duration_minutes, difficulty, reason, confidence::float8 AS confidence, score_breakdown, status, intervention_id, created_at, accepted_at';

export async function insertRecommendation(
  { learnerId, action, targetTopicId, durationMinutes, difficulty, reason, confidence, scoreBreakdown },
  client = { query }
) {
  const result = await client.query(
    `INSERT INTO recommendation (learner_id, action, target_topic_id, duration_minutes, difficulty, reason, confidence, score_breakdown)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
     RETURNING ${COLUMNS}`,
    [learnerId, action, targetTopicId ?? null, durationMinutes ?? null, difficulty ?? null, reason, confidence, JSON.stringify(scoreBreakdown ?? {})]
  );
  return result.rows[0];
}

export async function findRecommendationById(id, client = { query }) {
  const result = await client.query(`SELECT ${COLUMNS} FROM recommendation WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findRecommendationsForLearner(learnerId, limit = 20, client = { query }) {
  const result = await client.query(`SELECT ${COLUMNS} FROM recommendation WHERE learner_id = $1 ORDER BY created_at DESC LIMIT $2`, [
    learnerId,
    limit,
  ]);
  return result.rows;
}

export async function acceptRecommendationRow(id, interventionId, client = { query }) {
  const result = await client.query(
    `UPDATE recommendation SET status = 'ACCEPTED', accepted_at = now(), intervention_id = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, interventionId ?? null]
  );
  return result.rows[0] ?? null;
}
