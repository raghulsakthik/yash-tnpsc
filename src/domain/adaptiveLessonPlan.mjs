/**
 * Phase 12 — Adaptive Lesson Modification.
 *
 * Phase 5's buildLearningPath() (learningPath.mjs, unchanged) answers "what
 * should she do right now" — and deliberately stops the moment it hits a
 * topic whose prerequisite is broken, because practicing past an unresolved
 * gate is pointless *today*. This module answers a different question: what
 * does her *whole* projected route through the syllabus look like, assuming
 * the remediation it recommends actually works? So it never stops — it
 * splices the remediation in and keeps projecting forward, exactly like the
 * worked example: Percentage's own gap doesn't erase Ratio from the plan,
 * it just inserts a detour before Ratio.
 *
 * Reuses the Adaptive Decision Engine (adaptiveDecision.mjs, Phase 11)
 * per-topic, unchanged — this module only decides what one decision means
 * for the *sequence*, the same division of labor learningPath.mjs already
 * established for Phase 4's classifications.
 */

import { AdaptiveAction } from './enums.mjs';

export const LessonPlanStepType = Object.freeze({
  ADVANCE: 'ADVANCE',
  PRACTICE: 'PRACTICE',
  TIMED_PRACTICE: 'TIMED_PRACTICE',
  LESSON: 'LESSON',
  PREREQUISITE_LESSON: 'PREREQUISITE_LESSON',
  REASSESSMENT: 'REASSESSMENT',
  MEMORY_ECHO: 'MEMORY_ECHO',
  REVISION: 'REVISION',
  MINI_ASSESSMENT: 'MINI_ASSESSMENT',
});

/**
 * @param {Array<string>} syllabusTopicIds topics in curriculum order
 * @param {Map<string, {action: string, reason: string, context: {weakestPrerequisite: {topicId: string}|null}}>} decisionsByTopic
 *   one Adaptive Decision Engine result per topic — order doesn't matter, this re-sequences by syllabusTopicIds
 * @returns {Array<{type: string, topicId: string, reason: string}>}
 */
export function buildAdaptiveLessonPlan(syllabusTopicIds, decisionsByTopic) {
  const steps = [];

  for (const topicId of syllabusTopicIds) {
    const decision = decisionsByTopic.get(topicId);
    if (!decision) continue; // no decision available for this topic — skip it, don't block the rest of the plan

    const { action, reason, context } = decision;

    switch (action) {
      case AdaptiveAction.ADVANCE_TOPIC:
        steps.push({ type: LessonPlanStepType.ADVANCE, topicId, reason });
        break;

      case AdaptiveAction.PRACTICE:
        steps.push({ type: LessonPlanStepType.PRACTICE, topicId, reason });
        break;

      case AdaptiveAction.TIMED_PRACTICE:
        // The worked example's "Timed Percentage" — a direct, single step,
        // not a detour: accuracy already holds up, only pace needs work.
        steps.push({ type: LessonPlanStepType.TIMED_PRACTICE, topicId, reason });
        break;

      case AdaptiveAction.MEMORY_ECHO:
        steps.push({ type: LessonPlanStepType.MEMORY_ECHO, topicId, reason });
        break;

      case AdaptiveAction.REVISION:
        steps.push({ type: LessonPlanStepType.REVISION, topicId, reason });
        break;

      case AdaptiveAction.MINI_ASSESSMENT:
        steps.push({ type: LessonPlanStepType.MINI_ASSESSMENT, topicId, reason });
        break;

      case AdaptiveAction.REPEAT_LESSON:
        // A self-contained gap: reteach this topic, practice it, confirm it
        // stuck — then the loop continues to whatever comes next.
        steps.push({ type: LessonPlanStepType.LESSON, topicId, reason });
        steps.push({ type: LessonPlanStepType.PRACTICE, topicId, reason: `practice ${topicId} after the reteach` });
        steps.push({ type: LessonPlanStepType.REASSESSMENT, topicId, reason: `confirm ${topicId} stuck before moving on` });
        break;

      case AdaptiveAction.PREREQUISITE_LESSON: {
        // The worked example exactly: fix the prerequisite first (its own
        // lesson, practice, reassessment), then still come back and give
        // the original topic its own lesson/practice/reassessment — a
        // weak prerequisite explains why she's stuck, it doesn't mean the
        // topic itself needs no attention once the prerequisite is fixed.
        const prereqId = context?.weakestPrerequisite?.topicId ?? topicId;
        steps.push({ type: LessonPlanStepType.PREREQUISITE_LESSON, topicId: prereqId, reason });
        steps.push({ type: LessonPlanStepType.PRACTICE, topicId: prereqId, reason: `practice ${prereqId} before returning to ${topicId}` });
        steps.push({ type: LessonPlanStepType.REASSESSMENT, topicId: prereqId, reason: `confirm ${prereqId} is solid` });
        steps.push({ type: LessonPlanStepType.LESSON, topicId, reason: `now revisit ${topicId} itself` });
        steps.push({ type: LessonPlanStepType.PRACTICE, topicId, reason: `practice ${topicId}` });
        steps.push({ type: LessonPlanStepType.REASSESSMENT, topicId, reason: `confirm ${topicId} stuck before moving on` });
        break;
      }

      default:
        steps.push({ type: LessonPlanStepType.PRACTICE, topicId, reason });
    }
  }

  return steps;
}
