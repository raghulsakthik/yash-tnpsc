/**
 * Phase 23 — the Cross-Subject Adaptive Engine's subject-priority layer.
 *
 * Every phase so far decided "which topic" within one fixed pool (Phase 7's
 * foundation candidates, Phase 18's expanded pool, Phase 20's proof that
 * the same engines work on any subject). Nothing decided "which subject"
 * at all. This module is the one new decision: the same weighted-sum
 * pattern selectTopic() (selection.mjs, unchanged) already uses, lifted
 * one level up — weakness, real exam weight, neglect, and momentum, now
 * computed per subject instead of per topic.
 */

import { clamp01 } from './accuracy.mjs';

export const SUBJECT_WEIGHTS = Object.freeze({
  weakness: 0.3,
  examWeight: 0.35,
  neglect: 0.2,
  momentum: 0.15,
});

// A subject untouched for this many days (or ever) counts as fully
// neglected — the one signal with no topic-level analogue, since a single
// topic doesn't accumulate "days since I looked at this subject at all."
export const NEGLECT_FULL_DAYS = 14;

/** @param {Date|string|null} lastStudiedAt @param {Date} [now] */
export function daysSince(lastStudiedAt, now = new Date()) {
  if (!lastStudiedAt) return null;
  return Math.max(0, (now.getTime() - new Date(lastStudiedAt).getTime()) / 86400000);
}

/**
 * A subject's real share of the whole paper — summed from the same
 * chapter.question_count values examWeight() already draws from for
 * topics, never invented.
 */
export function subjectExamWeight(subjectQuestionCount, maxSubjectQuestionCount) {
  if (!subjectQuestionCount) return 0;
  return clamp01(subjectQuestionCount / (maxSubjectQuestionCount || 1));
}

/**
 * @param {Array<{id: string, name: string, accuracy: number, examWeight: number,
 *   attemptCount: number, daysSinceLastStudied: number|null}>} subjects
 * @returns {object|null} the highest-scoring subject, with `score` attached
 */
export function selectSubject(subjects) {
  if (!Array.isArray(subjects) || subjects.length === 0) return null;

  let best = null;
  for (const s of subjects) {
    // Untouched is not "weak" so much as "unknown" — same stance
    // selectTopic() already takes, lifted to the subject level.
    const weakness = s.attemptCount === 0 ? 0.6 : 1 - clamp01(s.accuracy);
    const neglectDays = s.daysSinceLastStudied ?? NEGLECT_FULL_DAYS;
    const neglect = clamp01(neglectDays / NEGLECT_FULL_DAYS);
    const momentum = s.attemptCount > 0 && s.attemptCount < 50 ? 1 : 0.3;

    const score =
      SUBJECT_WEIGHTS.weakness * weakness +
      SUBJECT_WEIGHTS.examWeight * clamp01(s.examWeight) +
      SUBJECT_WEIGHTS.neglect * neglect +
      SUBJECT_WEIGHTS.momentum * momentum;

    if (!best || score > best.score) best = { ...s, score };
  }
  return best;
}
