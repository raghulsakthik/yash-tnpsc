// Phase 14 — repository for the new `intervention` table (V9).
import { query } from '../lib/db.mjs';

const COLUMNS =
  'id, learner_id, topic_id, intervention_type, baseline_score::float8 AS baseline_score, ' +
  'baseline_retention::float8 AS baseline_retention, started_at, time_spent_ms, ' +
  'post_score::float8 AS post_score, post_retention::float8 AS post_retention, ' +
  'learning_gain::float8 AS learning_gain, retention_gain::float8 AS retention_gain, status, evaluated_at, ' +
  'learner_state_snapshot';

// learnerStateSnapshot is new (Phase 30.2) and optional — every existing
// caller that doesn't pass one still gets the exact same insert it always
// did, just with a real NULL in the new, nullable column (V17).
export async function createIntervention(
  { learnerId, topicId, interventionType, baselineScore, baselineRetention, learnerStateSnapshot = null },
  client = { query }
) {
  const result = await client.query(
    `INSERT INTO intervention (learner_id, topic_id, intervention_type, baseline_score, baseline_retention, learner_state_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING ${COLUMNS}`,
    [learnerId, topicId, interventionType, baselineScore, baselineRetention, learnerStateSnapshot ? JSON.stringify(learnerStateSnapshot) : null]
  );
  return result.rows[0];
}

export async function findInterventionById(id, client = { query }) {
  const result = await client.query(`SELECT ${COLUMNS} FROM intervention WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findInterventionsForLearner(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT ${COLUMNS} FROM intervention WHERE learner_id = $1 ORDER BY started_at DESC`,
    [learnerId]
  );
  return result.rows;
}

export async function markInterventionEvaluated(
  { id, postScore, postRetention, learningGain, retentionGain, timeSpentMs },
  client = { query }
) {
  const result = await client.query(
    `UPDATE intervention
        SET status = 'EVALUATED', evaluated_at = now(), post_score = $2, post_retention = $3,
            learning_gain = $4, retention_gain = $5, time_spent_ms = $6
      WHERE id = $1
      RETURNING ${COLUMNS}`,
    [id, postScore, postRetention, learningGain, retentionGain, timeSpentMs]
  );
  return result.rows[0] ?? null;
}

// Time actually spent on the topic since the intervention started — summed
// from the same question_attempt rows recordAttempt() already writes, not
// a new tracking mechanism.
export async function sumAttemptTimeSince(learnerId, topicId, since, client = { query }) {
  const result = await client.query(
    `SELECT COALESCE(SUM(time_taken_ms), 0)::bigint AS total
       FROM question_attempt WHERE learner_id = $1 AND topic_id = $2 AND created_at >= $3`,
    [learnerId, topicId, since]
  );
  return Number(result.rows[0].total);
}
