// Phase 12 — Adaptive Lesson Modification orchestration. Gathers an Adaptive
// Decision (Phase 11, unchanged) for every candidate topic in real syllabus
// order (both reused from Phase 3/5, unchanged) and projects the full route.
import { buildAdaptiveLessonPlan } from '../domain/adaptiveLessonPlan.mjs';
import { decideNextActionForTopic } from './adaptiveDecisionService.mjs';
import { findDefaultAssessmentCandidateTopics, findTopicsInSyllabusOrder } from '../repository/defaultAssessmentRepository.mjs';

export async function getAdaptiveLessonPlan(learnerId) {
  const candidateTopics = await findDefaultAssessmentCandidateTopics();
  const topicIds = candidateTopics.map((t) => t.id);
  const syllabusOrder = await findTopicsInSyllabusOrder(topicIds);

  const decisions = await Promise.all(syllabusOrder.map((topicId) => decideNextActionForTopic(learnerId, topicId)));
  const decisionsByTopic = new Map(syllabusOrder.map((topicId, i) => [topicId, decisions[i]]));

  const steps = buildAdaptiveLessonPlan(syllabusOrder, decisionsByTopic);
  return { learnerId, syllabusOrder, steps };
}
