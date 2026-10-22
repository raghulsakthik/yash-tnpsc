import { query } from '../lib/db.mjs';

export async function createRecommendation({ learnerId, action, targetTopicId, durationMinutes = null, difficulty = null, reason, confidence, scoreBreakdown = {} }, client = { query }) {
  const result = await client.query(
    `INSERT INTO recommendation
      (learner_id, action, target_topic_id, duration_minutes, difficulty, reason, confidence, score_breakdown)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
     RETURNING id, learner_id, action, target_topic_id, duration_minutes, difficulty, reason, confidence::float8 AS confidence,
               score_breakdown, status, intervention_id, created_at, accepted_at`,
    [learnerId, action, targetTopicId, durationMinutes, difficulty, reason, confidence, JSON.stringify(scoreBreakdown)]
  );
  return result.rows[0];
}

export async function findRecommendationForLearner(id, learnerId, client = { query }) {
  const result = await client.query(
    `SELECT id, learner_id, action, target_topic_id, duration_minutes, difficulty, reason,
            confidence::float8 AS confidence, score_breakdown, status, intervention_id, created_at, accepted_at
       FROM recommendation WHERE id = $1 AND learner_id = $2`,
    [id, learnerId]
  );
  return result.rows[0] ?? null;
}

export async function listRecommendations(learnerId, limit = 20, client = { query }) {
  const result = await client.query(
    `SELECT id, action, target_topic_id, duration_minutes, difficulty, reason,
            confidence::float8 AS confidence, score_breakdown, status, intervention_id, created_at, accepted_at
       FROM recommendation WHERE learner_id = $1
       ORDER BY created_at DESC LIMIT $2`,
    [learnerId, limit]
  );
  return result.rows;
}

export async function acceptRecommendation({ id, learnerId, interventionId }, client = { query }) {
  const result = await client.query(
    `UPDATE recommendation
        SET status = 'ACCEPTED', intervention_id = $3, accepted_at = now()
      WHERE id = $1 AND learner_id = $2 AND status = 'PENDING'
      RETURNING id, learner_id, action, target_topic_id, duration_minutes, difficulty, reason,
                confidence::float8 AS confidence, score_breakdown, status, intervention_id, created_at, accepted_at`,
    [id, learnerId, interventionId]
  );
  return result.rows[0] ?? null;
}

export async function dismissRecommendation(id, learnerId, client = { query }) {
  const result = await client.query(
    `UPDATE recommendation SET status = 'DISMISSED'
      WHERE id = $1 AND learner_id = $2 AND status = 'PENDING'
      RETURNING id, status`,
    [id, learnerId]
  );
  return result.rows[0] ?? null;
}

export async function createIntervention({ learnerId, topicId, interventionType, baselineScore, baselineRetention }, client = { query }) {
  const result = await client.query(
    `INSERT INTO intervention
      (learner_id, topic_id, intervention_type, baseline_score, baseline_retention)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, learner_id, topic_id, intervention_type, baseline_score::float8 AS baseline_score,
               baseline_retention::float8 AS baseline_retention, started_at, status`,
    [learnerId, topicId, interventionType, baselineScore, baselineRetention]
  );
  return result.rows[0];
}


export async function startInterventionIfNeeded({ learnerId, topicId, interventionType, baselineScore, baselineRetention }, client = { query }) {
  const existing = await client.query(
    `SELECT id, learner_id, topic_id, intervention_type,
            baseline_score::float8 AS baseline_score, baseline_retention::float8 AS baseline_retention,
            started_at, time_spent_ms, status
       FROM intervention
      WHERE learner_id=$1 AND topic_id=$2 AND status='ACTIVE'
      ORDER BY started_at DESC LIMIT 1`,
    [learnerId, topicId]
  );
  if (existing.rows[0]) return existing.rows[0];
  return createIntervention({ learnerId, topicId, interventionType, baselineScore, baselineRetention }, client);
}

export async function countAttemptsSinceIntervention({ learnerId, topicId, startedAt }, client = { query }) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
       FROM question_attempt
      WHERE learner_id=$1 AND topic_id=$2 AND created_at >= $3`,
    [learnerId, topicId, startedAt]
  );
  return Number(result.rows[0]?.count || 0);
}

export async function evaluateActiveIntervention({ learnerId, topicId, postScore, postRetention, timeSpentMs = null }, client = { query }) {
  const result = await client.query(
    `WITH candidate AS (
       SELECT id, baseline_score::float8 AS baseline_score, baseline_retention::float8 AS baseline_retention,
              started_at
         FROM intervention
        WHERE learner_id = $1 AND topic_id = $2 AND status = 'ACTIVE'
        ORDER BY started_at DESC LIMIT 1
     )
     UPDATE intervention i
        SET post_score = $3::numeric,
            post_retention = $4::numeric,
            time_spent_ms = COALESCE($5, i.time_spent_ms),
            learning_gain = $3::double precision - c.baseline_score,
            retention_gain = $4::double precision - c.baseline_retention,
            status = 'EVALUATED',
            evaluated_at = now()
       FROM candidate c
      WHERE i.id = c.id
      RETURNING i.id, i.baseline_score::float8 AS baseline_score, i.post_score::float8 AS post_score,
                i.learning_gain::float8 AS learning_gain, i.baseline_retention::float8 AS baseline_retention,
                i.post_retention::float8 AS post_retention, i.retention_gain::float8 AS retention_gain,
                i.status, i.evaluated_at`,
    [learnerId, topicId, postScore, postRetention, timeSpentMs]
  );
  return result.rows[0] ?? null;
}
