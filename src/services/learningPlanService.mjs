// Phase 7 — LearningPlanService: one valid initial learning action for any
// learner, gated by real prerequisite evidence. Reuses the exact same
// "foundation candidate topics" the Default Foundation Test (Phase 3)
// already defines (foundation + its direct dependents) — the two concerns
// (what to test, what to recommend first) draw from the same set on
// purpose, not two divergent notions of "foundation."
import { examWeight } from '../domain/selection.mjs';
import { gateTopic, selectInitialAction } from '../domain/learningPlan.mjs';
import { findDefaultAssessmentCandidateTopics, findPrerequisiteGraphForTopics } from '../repository/defaultAssessmentRepository.mjs';
import { findCandidateTopicStates } from '../repository/learningPlanRepository.mjs';

export async function getInitialLearningAction(learnerId) {
  const candidateTopics = await findDefaultAssessmentCandidateTopics();
  const topicIds = candidateTopics.map((t) => t.id);

  if (topicIds.length === 0) {
    return { action: 'NONE', reason: 'no foundation topics are defined yet', topicId: null, topicName: null, difficulty: null, gatedOut: [] };
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
      action: 'BLOCKED',
      reason: 'every foundation candidate topic is currently gated',
      topicId: null,
      topicName: null,
      difficulty: null,
      gatedOut: candidates.map((c) => ({ topicId: c.id, reason: c.gate.reason })),
    };
  }

  return { action: result.stepType, ...result };
}
