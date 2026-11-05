// Phase 12 — Adaptive Lesson Modification orchestration. Gathers an Adaptive
// Decision (Phase 11, unchanged) for every candidate topic in real syllabus
// order (both reused from Phase 3/5, unchanged) and projects the full route.
import { buildAdaptiveLessonPlan } from '../domain/adaptiveLessonPlan.mjs';
import { decideNextActionForTopic } from './adaptiveDecisionService.mjs';
import { findDefaultAssessmentCandidateTopics, findTopicsInSyllabusOrder } from '../repository/defaultAssessmentRepository.mjs';
import { query } from '../lib/db.mjs';

const STEP_MINUTES = Object.freeze({
  ADVANCE: 10,
  PRACTICE: 15,
  TIMED_PRACTICE: 15,
  LESSON: 20,
  PREREQUISITE_LESSON: 20,
  REASSESSMENT: 10,
  MEMORY_ECHO: 10,
  REVISION: 10,
  MINI_ASSESSMENT: 10,
});

export async function getAdaptiveLessonPlan(learnerId) {
  const candidateTopics = await findDefaultAssessmentCandidateTopics();
  const topicIds = candidateTopics.map((t) => t.id);
  const syllabusOrder = await findTopicsInSyllabusOrder(topicIds);

  const decisions = await Promise.all(syllabusOrder.map((topicId) => decideNextActionForTopic(learnerId, topicId)));
  const decisionsByTopic = new Map(syllabusOrder.map((topicId, i) => [topicId, decisions[i]]));

  const steps = buildAdaptiveLessonPlan(syllabusOrder, decisionsByTopic);
  const { rows: topicRows } = await query(
    `SELECT t.id AS "topicId", t.name AS "topicName", s.name AS "subjectName",
            c.name AS "chapterName", c.sort_order AS "chapterOrder", t.sort_order AS "topicOrder"
       FROM topic t
       JOIN chapter c ON c.id=t.chapter_id
       JOIN subject s ON s.id=c.subject_id
      WHERE t.id=ANY($1::text[])`,
    [syllabusOrder]
  );
  const topicById = new Map(topicRows.map((topic) => [topic.topicId, topic]));
  const enrichedSteps = steps.map((step, index) => {
    const topic = topicById.get(step.topicId);
    const decision = decisionsByTopic.get(step.topicId);
    return {
      ...step,
      stepNumber: index + 1,
      topicName: topic?.topicName ?? step.topicId,
      subjectName: topic?.subjectName ?? 'TNPSC',
      chapterName: topic?.chapterName ?? '',
      estimatedMinutes: STEP_MINUTES[step.type] ?? 15,
      classification: decision?.context?.classification ?? 'UNKNOWN',
      accuracy: Number(decision?.context?.accuracy ?? 0),
      mastery: Number(decision?.context?.mastery ?? 0),
      weakestPrerequisite: decision?.context?.weakestPrerequisite ?? null,
    };
  });
  const topicInsights = syllabusOrder.map((topicId) => {
    const decision = decisionsByTopic.get(topicId);
    const topic = topicById.get(topicId);
    return {
      topicId,
      topicName: topic?.topicName ?? topicId,
      subjectName: topic?.subjectName ?? 'TNPSC',
      classification: decision?.context?.classification ?? 'UNKNOWN',
      classificationReason: decision?.context?.classificationReason ?? 'No learner evidence is available yet.',
      action: decision?.action ?? 'PRACTICE',
      reason: decision?.reason ?? 'Practice is the safe default.',
      accuracy: Number(decision?.context?.accuracy ?? 0),
      mastery: Number(decision?.context?.mastery ?? 0),
      attemptCount: Number(decision?.context?.attemptCount ?? 0),
      weakestPrerequisite: decision?.context?.weakestPrerequisite ?? null,
    };
  });
  return { learnerId, syllabusOrder, steps: enrichedSteps, topicInsights };
}
