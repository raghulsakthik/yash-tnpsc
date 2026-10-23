import { pool } from '../lib/db.mjs';
import { decideNextActionForTopic } from './adaptiveDecisionService.mjs';
import { getTopicState } from './learnerStateService.mjs';
import { NotFoundError } from './errors.mjs';
import {
  createRecommendation,
  findRecommendationForLearner,
  listRecommendations,
  acceptRecommendation,
  dismissRecommendation,
  createIntervention,
  startInterventionIfNeeded,
  countAttemptsSinceIntervention,
  evaluateActiveIntervention,
} from '../repository/recommendationRepository.mjs';

const ACTION_DURATION = {
  REPEAT_LESSON: 20,
  PREREQUISITE_LESSON: 20,
  PRACTICE: 15,
  TIMED_PRACTICE: 15,
  REVISION: 10,
  MEMORY_ECHO: 10,
  ADVANCE_TOPIC: 20,
  MINI_ASSESSMENT: 10,
};

export async function surfaceRecommendation(learnerId, topicId) {
  const decision = await decideNextActionForTopic(learnerId, topicId);
  const score = Math.max(0, Math.min(1, Number(decision.score ?? 0)));
  return createRecommendation({
    learnerId,
    action: decision.action,
    targetTopicId: topicId,
    durationMinutes: ACTION_DURATION[decision.action] ?? 15,
    difficulty: decision.context?.mastery >= 0.7 ? 'ADVANCED' : 'FOUNDATION',
    reason: decision.reason,
    confidence: score,
    scoreBreakdown: {
      candidates: decision.candidates,
      context: decision.context,
    },
  });
}

export async function acceptRecommendationForLearner(learnerId, recommendationId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const recommendation = await findRecommendationForLearner(recommendationId, learnerId, client);
    if (!recommendation) throw new NotFoundError('Recommendation not found');
    if (recommendation.status !== 'PENDING') return recommendation;
    if (!recommendation.target_topic_id) throw new Error('Recommendation has no target topic');

    let state;
    try {
      state = await getTopicState(learnerId, recommendation.target_topic_id);
    } catch (err) {
      if (!(err instanceof NotFoundError)) throw err;
      state = { mastery: 0, retention: 0 };
    }

    const intervention = await createIntervention({
      learnerId,
      topicId: recommendation.target_topic_id,
      interventionType: recommendation.action,
      baselineScore: Math.max(0, Math.min(1, Number(state.mastery ?? 0))),
      baselineRetention: Math.max(0, Math.min(1, Number(state.retention ?? 0))),
    }, client);

    const accepted = await acceptRecommendation({ id: recommendationId, learnerId, interventionId: intervention.id }, client);
    if (!accepted) throw new Error('Recommendation could not be accepted');
    await client.query('COMMIT');
    return { recommendation: accepted, intervention };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function dismissRecommendationForLearner(learnerId, recommendationId) {
  const result = await dismissRecommendation(recommendationId, learnerId);
  if (!result) throw new NotFoundError('Pending recommendation not found');
  return result;
}

export async function getRecommendationsForLearner(learnerId, limit = 20) {
  return listRecommendations(learnerId, Math.min(Math.max(Number(limit) || 20, 1), 100));
}

export async function evaluateInterventionForTopic(learnerId, topicId, timeSpentMs = null) {
  let state;
  try {
    state = await getTopicState(learnerId, topicId);
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
    return null;
  }
  return evaluateActiveIntervention({
    learnerId,
    topicId,
    postScore: Math.max(0, Math.min(1, Number(state.mastery ?? 0))),
    postRetention: Math.max(0, Math.min(1, Number(state.retention ?? 0))),
    timeSpentMs,
  });
}


export async function startInterventionForLearner(learnerId, { topicId, action }) {
  if (!topicId || !action) throw new Error('topicId and action are required');
  let state;
  try {
    state = await getTopicState(learnerId, topicId);
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
    state = { mastery: 0, retention: 0 };
  }
  return startInterventionIfNeeded({
    learnerId,
    topicId,
    interventionType: action,
    baselineScore: Math.max(0, Math.min(1, Number(state.mastery ?? 0))),
    baselineRetention: Math.max(0, Math.min(1, Number(state.retention ?? 0))),
  });
}

export async function maybeEvaluateIntervention(learnerId, topicId) {
  const active = await pool.query(
    `SELECT id, started_at, time_spent_ms FROM intervention
      WHERE learner_id=$1 AND topic_id=$2 AND status='ACTIVE'
      ORDER BY started_at DESC LIMIT 1`,
    [learnerId, topicId]
  );
  if (!active.rows[0]) return null;
  const count = await countAttemptsSinceIntervention({ learnerId, topicId, startedAt: active.rows[0].started_at });
  if (count < 3) return null;
  return evaluateInterventionForTopic(learnerId, topicId, active.rows[0].time_spent_ms);
}
