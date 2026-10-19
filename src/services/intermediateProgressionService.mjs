// Phase 18 — IntermediateProgressionService. Reuses getMasteryGate() (Phase
// 13), gateTopic()/selectInitialAction() (Phase 7's pure domain layer,
// learningPlan.mjs), findCandidateTopicStates() and
// findPrerequisiteGraphForTopics() (both already parameterized by an
// arbitrary topicIds array, Phase 7/3) — nothing here duplicates any
// decision logic, only the candidate *pool* changes shape.
import { examWeight } from '../domain/selection.mjs';
import { gateTopic, selectInitialAction } from '../domain/learningPlan.mjs';
import { evaluateProgressionTier, buildCandidatePool } from '../domain/intermediateProgression.mjs';
import { getMasteryGate } from './masteryGateService.mjs';
import { findDefaultAssessmentCandidateTopics, findPrerequisiteGraphForTopics } from '../repository/defaultAssessmentRepository.mjs';
import { findCandidateTopicStates } from '../repository/learningPlanRepository.mjs';
import { findFoundationTopics, findIntermediateCandidateTopics } from '../repository/intermediateProgressionRepository.mjs';

/**
 * The learner-level progression state: whether every real foundation topic
 * has actually been mastered-and-confirmed (Phase 13's gate, not just
 * practice accuracy), one gate result per topic for transparency.
 */
export async function getProgressionTier(learnerId) {
  const foundationTopics = await findFoundationTopics();
  const gateResults = await Promise.all(
    foundationTopics.map(async (t) => {
      const gate = await getMasteryGate(learnerId, t.id);
      return { topicId: t.id, topicName: t.name, ready: gate.ready, status: gate.status };
    })
  );
  const evaluation = evaluateProgressionTier(gateResults);
  return { ...evaluation, foundationTopics: gateResults };
}

export async function getCandidatePool(learnerId) {
  const [progression, foundationCandidates, intermediateCandidates] = await Promise.all([
    getProgressionTier(learnerId),
    findDefaultAssessmentCandidateTopics(),
    findIntermediateCandidateTopics(),
  ]);

  const pool = buildCandidatePool({
    tier: progression.tier,
    foundationCandidateIds: foundationCandidates.map((t) => t.id),
    intermediateCandidateIds: intermediateCandidates.map((t) => t.id),
  });

  return { ...pool, progression };
}

/**
 * The same gated topic-selection Phase 7's getInitialLearningAction()
 * performs, but over whichever pool getCandidatePool() currently allows —
 * "the adaptive engine decides which one to expose," from the expanded
 * pool once she's earned it. Phase 7's own service and route are untouched;
 * this composes the same lower-level pure functions independently.
 */
export async function getExpandedNextAction(learnerId) {
  const pool = await getCandidatePool(learnerId);
  const topicIds = pool.topicIds;

  if (topicIds.length === 0) {
    return { ...pool, action: 'NONE', reason: 'no candidate topics are defined yet', topicId: null, gatedOut: [] };
  }

  const [states, edges] = await Promise.all([
    findCandidateTopicStates(learnerId, topicIds),
    findPrerequisiteGraphForTopics(topicIds),
  ]);

  const prerequisiteGraph = new Map();
  for (const e of edges) {
    if (!prerequisiteGraph.has(e.topic_id)) prerequisiteGraph.set(e.topic_id, []);
    prerequisiteGraph.get(e.topic_id).push({ id: e.prerequisite_topic_id, strength: e.strength });
  }
  const accuracyByTopic = new Map(states.map((s) => [s.id, s.accuracy]));
  const maxChapterQuestionCount = Math.max(1, ...states.map((s) => s.chapter_question_count));

  const candidates = states.map((s) => {
    const gate = gateTopic(s.id, prerequisiteGraph, accuracyByTopic);
    return {
      id: s.id,
      name: s.name,
      accuracy: s.accuracy,
      attemptCount: s.attempt_count,
      currentDifficulty: s.current_difficulty,
      examWeight: examWeight(s.chapter_question_count, s.topic_count, maxChapterQuestionCount),
      prerequisiteGap: gate.weakestPrerequisite ? 1 - gate.weakestPrerequisite.accuracy / 100 : 0,
      gate,
    };
  });

  const result = selectInitialAction(candidates);
  if (!result) {
    return {
      ...pool,
      action: 'BLOCKED',
      reason: 'every candidate topic is currently gated',
      topicId: null,
      gatedOut: candidates.map((c) => ({ topicId: c.id, reason: c.gate.reason })),
    };
  }

  return { ...pool, action: result.stepType, ...result };
}
