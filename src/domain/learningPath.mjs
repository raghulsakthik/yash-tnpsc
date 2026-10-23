/**
 * Phase 5 — the Adaptive Foundation Lesson Engine.
 *
 * Turns a syllabus-ordered topic sequence plus Phase 4's per-topic
 * classification into one concrete, ordered learning path. The same
 * syllabus order produces a different journey for every learner, because
 * the path bends around where she actually is, not around a fixed lesson
 * plan — that bending is the entire point of this module.
 *
 * Deliberately a pure function over data the service layer gathers
 * (syllabus order, classifications): no DB, and no classification logic is
 * duplicated here — the five states and their reasons still come entirely
 * from classifyTopics() in diagnostic.mjs. This module only decides what a
 * classification *means for the path*.
 */

import { TopicClassification } from './enums.mjs';

export const PathStepType = Object.freeze({
  FOUNDATION: 'FOUNDATION',
  PRACTICE: 'PRACTICE',
  ADVANCE: 'ADVANCE',
  GATHER_EVIDENCE: 'GATHER_EVIDENCE',
});

/**
 * @param {Array<string>} syllabusTopicIds topics in curriculum order (e.g. chapter/topic sort_order)
 * @param {Array<{topicId: string, classification: string, reason: string, weakestPrerequisite: object|null}>} classifications
 *   output of classifyTopics(), one entry per topic — order doesn't matter, this function re-sequences by syllabusTopicIds
 * @returns {{steps: Array<{type: string, topicId: string, reason: string}>, blocked: boolean, blockedReason: string|null}}
 */
export function buildLearningPath(syllabusTopicIds, classifications) {
  const byTopic = new Map(classifications.map((c) => [c.topicId, c]));
  const steps = [];
  let blocked = false;
  let blockedReason = null;

  for (const topicId of syllabusTopicIds) {
    const classification = byTopic.get(topicId);
    const state = classification?.classification ?? TopicClassification.UNKNOWN;

    if (state === TopicClassification.STRONG) {
      steps.push({ type: PathStepType.ADVANCE, topicId, reason: classification.reason });
      continue;
    }

    if (state === TopicClassification.UNKNOWN) {
      // Missing evidence is not the same as weak evidence — explore it
      // rather than blocking the path, same stance selectTopic() already
      // takes toward an untouched topic in the daily plan.
      steps.push({
        type: PathStepType.GATHER_EVIDENCE,
        topicId,
        reason: classification?.reason ?? `no evidence on ${topicId} yet`,
      });
      continue;
    }

    if (state === TopicClassification.WEAK) {
      // Self-contained weakness: nothing deeper is broken, so reinforce
      // this topic's own foundation and go straight on to practicing it,
      // then keep moving through the syllabus.
      steps.push({ type: PathStepType.FOUNDATION, topicId, reason: classification.reason });
      steps.push({ type: PathStepType.PRACTICE, topicId, reason: `practice ${topicId} after reinforcing its foundation` });
      continue;
    }

    // CRITICAL or PREREQUISITE_BLOCKED: reinforce this topic's own
    // foundation, then stop. Practicing (or advancing past) a topic whose
    // own prerequisite is shaky just builds on sand — Phase 4 already
    // produced the concrete fix (REINFORCE_PREREQUISITE, targeting
    // classification.weakestPrerequisite) as a *recommendation*; this path
    // simply does not continue past the gate until that's addressed.
    steps.push({ type: PathStepType.FOUNDATION, topicId, reason: classification.reason });
    blocked = true;
    blockedReason = classification.weakestPrerequisite
      ? `blocked on ${classification.weakestPrerequisite.topicId} (${classification.weakestPrerequisite.accuracy}%) before continuing past ${topicId}`
      : `blocked on ${topicId} itself before continuing`;
    break;
  }

  return { steps, blocked, blockedReason };
}
