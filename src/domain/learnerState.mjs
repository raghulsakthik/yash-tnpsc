/**
 * Phase 6 — the Learner Digital Twin: the three risk/velocity signals the
 * phase brief names that nothing in the engine computes yet
 * (learningVelocity, misconceptionRisk, fatigueRisk — prerequisiteRisk
 * reuses weakestPrerequisite() from selection.mjs directly, unchanged), plus
 * a TopicStateCalculator that assembles the full topic_state view.
 *
 * mastery/accuracy/concept/speed/retention/confidence/consistency are
 * deliberately NOT recomputed here — recordAttempt() (src/lib/attempts.mjs)
 * already computes and persists all six every time an attempt happens, and
 * that pipeline is untouched. This module only adds what's missing and
 * assembles the result; it never duplicates grading math.
 *
 * Critical rule from the brief: never store (or return) a bare score with
 * nothing behind it. Every function here that produces a risk number also
 * says how much evidence it had and what made the number what it is.
 */

import { clamp01 } from './accuracy.mjs';
import { weakestPrerequisite } from './selection.mjs';

const MIN_ATTEMPTS_FOR_TREND = 4;
const FATIGUE_TAIL_SIZE = 3;
const MIN_ATTEMPTS_FOR_FATIGUE = 6;

/**
 * Is she improving on this topic lately, or sliding? Splits the recent
 * window in half (newest vs older) and compares accuracy between the two —
 * a crude but explainable trend, not a regression model.
 *
 * @param {Array<{correct: boolean}>} recentAttempts newest first
 * @returns {{value: number, evidence: string}} value in [-1, 1]; positive = improving
 */
export function learningVelocity(recentAttempts) {
  if (!Array.isArray(recentAttempts) || recentAttempts.length < MIN_ATTEMPTS_FOR_TREND) {
    return { value: 0, evidence: `fewer than ${MIN_ATTEMPTS_FOR_TREND} attempts — not enough to read a trend` };
  }

  const half = Math.floor(recentAttempts.length / 2);
  const newer = recentAttempts.slice(0, half);
  const older = recentAttempts.slice(half);

  const accuracyOf = (group) => group.filter((a) => a.correct).length / group.length;
  const newerAccuracy = accuracyOf(newer);
  const olderAccuracy = accuracyOf(older);
  const value = Math.max(-1, Math.min(1, newerAccuracy - olderAccuracy));

  return {
    value,
    evidence: `last ${newer.length} attempts at ${Math.round(newerAccuracy * 100)}% vs the ${older.length} before that at ${Math.round(olderAccuracy * 100)}%`,
  };
}

/**
 * How much of her wrongness on this topic looks like a real gap in
 * understanding, rather than a guess, a slip, or running out of time —
 * reusing the mistakeType recordAttempt() already classified per attempt,
 * never reclassifying it.
 *
 * @param {Array<{mistakeType: string|null}>} recentAttempts
 * @returns {{value: number, evidence: string}} value in [0, 1]
 */
export function misconceptionRisk(recentAttempts) {
  if (!Array.isArray(recentAttempts) || recentAttempts.length === 0) {
    return { value: 0, evidence: 'no attempts yet' };
  }

  const conceptualMistakes = recentAttempts.filter(
    (a) => a.mistakeType === 'CONCEPTUAL' || a.mistakeType === 'UNKNOWN'
  ).length;
  const value = clamp01(conceptualMistakes / recentAttempts.length);

  return {
    value,
    evidence: `${conceptualMistakes} of the last ${recentAttempts.length} attempts read as a genuine conceptual gap, not a slip or a guess`,
  };
}

/**
 * Is she visibly tiring within this recent run — slower and less accurate on
 * the last few attempts than on the ones before them? A same-session signal
 * in spirit; in practice this reads the most recent attempts chronologically
 * rather than a strict session boundary, since practice attempts don't
 * consistently carry a session_id yet (see docs/phase-6-completion.md).
 *
 * @param {Array<{correct: boolean, timeTakenMs: number}>} recentAttempts newest first
 * @returns {{value: number, evidence: string}} value in [0, 1]
 */
export function fatigueRisk(recentAttempts) {
  if (!Array.isArray(recentAttempts) || recentAttempts.length < MIN_ATTEMPTS_FOR_FATIGUE) {
    return { value: 0, evidence: `fewer than ${MIN_ATTEMPTS_FOR_FATIGUE} attempts — not enough to read fatigue` };
  }

  const tail = recentAttempts.slice(0, FATIGUE_TAIL_SIZE);
  const rest = recentAttempts.slice(FATIGUE_TAIL_SIZE);

  const accuracyOf = (group) => group.filter((a) => a.correct).length / group.length;
  const avgSecondsOf = (group) => group.reduce((sum, a) => sum + a.timeTakenMs, 0) / group.length / 1000;

  const tailAccuracy = accuracyOf(tail);
  const restAccuracy = accuracyOf(rest);
  const tailSeconds = avgSecondsOf(tail);
  const restSeconds = avgSecondsOf(rest);

  const accuracyDrop = clamp01(restAccuracy - tailAccuracy);
  const speedDrop = clamp01((tailSeconds - restSeconds) / Math.max(1, restSeconds));
  const value = clamp01(accuracyDrop * 0.6 + speedDrop * 0.4);

  return {
    value,
    evidence: `most recent ${tail.length}: ${Math.round(tailAccuracy * 100)}% in ${tailSeconds.toFixed(1)}s avg, vs ${Math.round(restAccuracy * 100)}% in ${restSeconds.toFixed(1)}s avg before that`,
  };
}

/**
 * How much of a topic's own weakness is really someone else's problem —
 * reuses weakestPrerequisite() from selection.mjs (unchanged) rather than
 * re-walking the graph.
 *
 * @param {string} topicId
 * @param {Map<string, Array<{id: string, strength: number}>>} prerequisiteGraph
 * @param {Map<string, number>} accuracyByTopic
 * @returns {{value: number, evidence: string, weakestPrerequisite: {topicId: string, accuracy: number}|null}}
 */
export function prerequisiteRisk(topicId, prerequisiteGraph, accuracyByTopic) {
  const weakest = weakestPrerequisite(topicId, prerequisiteGraph, accuracyByTopic);
  if (!weakest) {
    return { value: 0, evidence: 'no weaker prerequisite found', weakestPrerequisite: null };
  }
  const value = clamp01(1 - weakest.accuracy);
  return {
    value,
    evidence: `weakest prerequisite is ${weakest.topicId} at ${Math.round(weakest.accuracy * 100)}%`,
    weakestPrerequisite: { topicId: weakest.topicId, accuracy: Math.round(weakest.accuracy * 10000) / 100 },
  };
}

/**
 * TopicStateCalculator: assembles the full digital-twin view for one topic —
 * the six persisted dimensions as-is (never recomputed here), plus the four
 * derived signals above, plus the evidence behind every one of them.
 *
 * @param {object} input
 * @param {object} input.persisted the learner_topic_state row (camelCased)
 * @param {Array<object>} input.recentAttempts newest first, as returned by the repository
 * @param {Map<string, Array<{id: string, strength: number}>>} input.prerequisiteGraph
 * @param {Map<string, number>} input.accuracyByTopic
 * @param {string} input.topicId
 */
export function computeTopicState({ persisted, recentAttempts, prerequisiteGraph, accuracyByTopic, topicId }) {
  const velocity = learningVelocity(recentAttempts);
  const misconception = misconceptionRisk(recentAttempts);
  const fatigue = fatigueRisk(recentAttempts);
  const prerequisite = prerequisiteRisk(topicId, prerequisiteGraph, accuracyByTopic);

  return {
    topicId,
    // Persisted — already computed by recordAttempt(), read as-is.
    mastery: persisted.mastery,
    accuracy: persisted.accuracy,
    concept: persisted.concept,
    speed: persisted.speed,
    retention: persisted.retention,
    confidence: persisted.confidence,
    consistency: persisted.consistency,
    attemptCount: persisted.attemptCount,
    // Derived here, read-time, not persisted (see docs/phase-6-completion.md).
    learningVelocity: velocity.value,
    misconceptionRisk: misconception.value,
    fatigueRisk: fatigue.value,
    prerequisiteRisk: prerequisite.value,
    weakestPrerequisite: prerequisite.weakestPrerequisite,
    // The rule: never a bare score. Every derived number above has its
    // reasoning here, and the raw window size is always visible too.
    evidence: {
      attemptsConsidered: recentAttempts.length,
      learningVelocity: velocity.evidence,
      misconceptionRisk: misconception.evidence,
      fatigueRisk: fatigue.evidence,
      prerequisiteRisk: prerequisite.evidence,
    },
  };
}
