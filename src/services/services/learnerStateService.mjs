// Phase 6 — the Learner Digital Twin: LearnerStateService. Reads historical
// evidence (question_attempt) and current derived state (learner_topic_state)
// and assembles both a single topic's full state and a learner-level
// summary. Nothing here writes anything — recordAttempt() in
// src/lib/attempts.mjs remains the only place learner state is mutated.
import { computeTopicState } from '../domain/learnerState.mjs';
import { classifyTopics, buildTopicRecommendations } from '../domain/diagnostic.mjs';
import { findPrerequisitesForTopic } from '../repository/curriculumRepository.mjs';
import {
  findTopicStateRow,
  findRecentAttemptsForTopic,
  findAllTouchedTopicStates,
  findPrerequisiteGraphForTopics,
  findAccuracyForTopics,
} from '../repository/learnerStateRepository.mjs';
import { NotFoundError } from './errors.mjs';

const RECENT_WINDOW = 20;

/**
 * The full digital-twin view for one topic: the six persisted dimensions as
 * they stand right now, plus learningVelocity/misconceptionRisk/fatigueRisk/
 * prerequisiteRisk computed fresh from recent evidence — never a bare score,
 * always the evidence behind it (see computeTopicState's `evidence` block).
 */
export async function getTopicState(learnerId, topicId) {
  const row = await findTopicStateRow(learnerId, topicId);
  if (!row) throw new NotFoundError(`no state for learner ${learnerId} on topic ${topicId} yet`);

  const recentAttempts = await findRecentAttemptsForTopic(learnerId, topicId, RECENT_WINDOW);

  const prereqEdges = await findPrerequisitesForTopic(topicId);
  const prerequisiteGraph = new Map([
    [topicId, prereqEdges.map((e) => ({ id: e.prerequisite_topic_id, strength: Number(e.strength) }))],
  ]);
  const prereqTopicIds = prereqEdges.map((e) => e.prerequisite_topic_id);
  const prereqAccuracyRows = await findAccuracyForTopics(learnerId, prereqTopicIds);
  const accuracyByTopic = new Map(prereqAccuracyRows.map((r) => [r.topic_id, r.accuracy]));
  for (const id of prereqTopicIds) if (!accuracyByTopic.has(id)) accuracyByTopic.set(id, 0);

  return computeTopicState({
    topicId,
    persisted: {
      mastery: row.mastery,
      accuracy: row.accuracy,
      concept: row.concept,
      speed: row.speed,
      retention: row.retention,
      confidence: row.confidence,
      consistency: row.consistency,
      attemptCount: row.attempt_count,
    },
    recentAttempts,
    prerequisiteGraph,
    accuracyByTopic,
  });
}

/**
 * The learner-level "current state": every topic she has touched at all,
 * classified live (STRONG/WEAK/CRITICAL/PREREQUISITE_BLOCKED/UNKNOWN) from
 * today's learner_topic_state — reusing Phase 4's classifyTopics()/
 * buildTopicRecommendations() unchanged, against live data rather than one
 * past assessment's snapshot — plus learner-level aggregates.
 */
export async function getLearnerSummary(learnerId) {
  const rows = await findAllTouchedTopicStates(learnerId);

  if (rows.length === 0) {
    return {
      learnerId,
      topicsTouched: 0,
      averageMastery: null,
      classifications: [],
      recommendations: [],
      counts: { STRONG: 0, WEAK: 0, CRITICAL: 0, PREREQUISITE_BLOCKED: 0, UNKNOWN: 0 },
    };
  }

  const topics = rows.map((r) => ({
    topicId: r.topic_id,
    topicName: r.topic_name,
    accuracy: Math.round(r.accuracy * 10000) / 100,
    questionCount: r.attempt_count,
  }));

  const topicIds = topics.map((t) => t.topicId);
  const graphRows = await findPrerequisiteGraphForTopics(topicIds);
  const prerequisiteGraph = new Map();
  for (const edge of graphRows) {
    if (!prerequisiteGraph.has(edge.topic_id)) prerequisiteGraph.set(edge.topic_id, []);
    prerequisiteGraph.get(edge.topic_id).push({ id: edge.prerequisite_topic_id, strength: edge.strength });
  }

  const classifications = classifyTopics(topics, prerequisiteGraph);
  const recommendations = buildTopicRecommendations(classifications);

  const counts = { STRONG: 0, WEAK: 0, CRITICAL: 0, PREREQUISITE_BLOCKED: 0, UNKNOWN: 0 };
  for (const c of classifications) counts[c.classification] += 1;

  const averageMastery = rows.reduce((sum, r) => sum + r.mastery, 0) / rows.length;

  return {
    learnerId,
    topicsTouched: rows.length,
    averageMastery: Math.round(averageMastery * 1000) / 1000,
    classifications,
    recommendations,
    counts,
  };
}
