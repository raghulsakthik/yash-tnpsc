// Phase 11 — AdaptiveDecisionEngine orchestration. Gathers the same
// evidence Phases 4 and 6 already compute (never recomputed here) and the
// one new fact this phase needs (whether revision is due), then hands it to
// the pure scoring engine in src/domain/adaptiveDecision.mjs.
import { decideAdaptiveAction } from '../domain/adaptiveDecision.mjs';
import { classifyTopics } from '../domain/diagnostic.mjs';
import { TopicClassification } from '../domain/enums.mjs';
import { getTopicState } from './learnerStateService.mjs';
import { NotFoundError } from './errors.mjs';
import { findPrerequisitesForTopic } from '../repository/curriculumRepository.mjs';
import { findAccuracyForTopics } from '../repository/learnerStateRepository.mjs';
import { isRevisionDue } from '../repository/adaptiveDecisionRepository.mjs';

async function classifyForTopic(learnerId, topicId, accuracy, attemptCount) {
  const prereqEdges = await findPrerequisitesForTopic(topicId);
  const prereqIds = prereqEdges.map((e) => e.prerequisite_topic_id);
  const prereqAccuracyRows = await findAccuracyForTopics(learnerId, prereqIds);
  const accuracyByTopic = new Map(prereqAccuracyRows.map((r) => [r.topic_id, r.accuracy]));
  for (const id of prereqIds) if (!accuracyByTopic.has(id)) accuracyByTopic.set(id, 0);

  const prerequisiteGraph = new Map([
    [topicId, prereqEdges.map((e) => ({ id: e.prerequisite_topic_id, strength: Number(e.strength) }))],
  ]);
  const topics = [{ topicId, accuracy: accuracy * 100, questionCount: attemptCount }];

  const [classification] = classifyTopics(topics, prerequisiteGraph);
  return classification;
}

/**
 * The Adaptive Decision for one learner on one topic: gathers the Phase 4
 * classification, the Phase 6 digital twin's risk signals, and whether
 * revision is due, then scores all eight candidate actions and returns the
 * winner plus every runner-up's score.
 */
export async function decideNextActionForTopic(learnerId, topicId) {
  let topicState;
  try {
    topicState = await getTopicState(learnerId, topicId);
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
    // No evidence at all yet — zeroed context, same convention Phases 6/7
    // already use for an untouched topic, not an error.
    topicState = {
      mastery: 0,
      accuracy: 0,
      speed: 0,
      retention: 0,
      attemptCount: 0,
      learningVelocity: 0,
      misconceptionRisk: 0,
      fatigueRisk: 0,
      prerequisiteRisk: 0,
    };
  }

  const classification = await classifyForTopic(learnerId, topicId, topicState.accuracy, topicState.attemptCount);
  const revisionDue = topicState.attemptCount > 0 ? await isRevisionDue(learnerId, topicId) : false;

  const context = {
    topicId,
    classification: classification?.classification ?? TopicClassification.UNKNOWN,
    accuracy: topicState.accuracy,
    speed: topicState.speed,
    retention: topicState.retention,
    mastery: topicState.mastery,
    misconceptionRisk: topicState.misconceptionRisk,
    prerequisiteRisk: topicState.prerequisiteRisk,
    revisionDue,
    attemptCount: topicState.attemptCount,
  };

  const decision = decideAdaptiveAction(context);
  return { ...decision, context };
}
