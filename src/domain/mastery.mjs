/**
 * Mastery, beyond accuracy and speed.
 *
 * accuracy_score and speed_score (accuracy.mjs) already exist and are
 * recency-weighted — "what can she do right now". The dimensions here are
 * slower-moving signals: lifetime grasp, stability, and whether her
 * confidence tracks reality. Retention comes from revision.mjs, not here.
 *
 * Mastery =
 *   0.30 concept + 0.25 accuracy + 0.15 speed +
 *   0.15 retention + 0.10 consistency + 0.05 confidence
 *
 * This is an initial model, not a discovered one (see the master doc,
 * "mastery calculation"). Each dimension is stored separately so the
 * weights can be revisited without losing history.
 */

import { clamp01 } from './accuracy.mjs';

export const MASTERY_WEIGHTS = {
  concept: 0.3,
  accuracy: 0.25,
  speed: 0.15,
  retention: 0.15,
  consistency: 0.1,
  confidence: 0.05,
};

/**
 * Lifetime, unweighted accuracy. Deliberately not recency-weighted: this is
 * "how much of this topic has she ever gotten right", the deep-grasp signal
 * accuracy_score is too jumpy to carry on its own.
 *
 * @param {number} correctCount
 * @param {number} attemptCount
 * @returns {number} 0..1, 0 when there are no attempts
 */
export function conceptScore(correctCount, attemptCount) {
  if (!attemptCount) return 0;
  return clamp01(correctCount / attemptCount);
}

/**
 * How stable her recent performance is, independent of whether it's good or
 * bad. A learner alternating right-wrong-right-wrong is less predictable
 * than one who is steadily right (or steadily wrong, which is its own
 * useful signal paired with low accuracy).
 *
 * Variance of a 0/1 sequence maxes at 0.25 (at p=0.5), so that's the scale.
 *
 * @param {Array<{correct: boolean}>} recentAttempts newest first
 * @returns {number} 0..1
 */
export function consistencyScore(recentAttempts) {
  if (!Array.isArray(recentAttempts) || recentAttempts.length < 2) return 0;

  const values = recentAttempts.map((a) => (a.correct ? 1 : 0));
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

  return clamp01(1 - variance / 0.25);
}

/**
 * Rewards confidence that tracks correctness: confident-and-right or
 * unsure-and-wrong both score well. Confident-and-wrong (overconfidence,
 * the dangerous one — she won't go back and check it) scores worst.
 *
 * @param {Array<{correct: boolean, confidence: number|null}>} attempts 1..5 confidence
 * @returns {number} 0..1
 */
export function confidenceCalibration(attempts) {
  const rated = (attempts ?? []).filter(
    (a) => a.confidence !== null && a.confidence !== undefined
  );
  if (rated.length === 0) return 0;

  let total = 0;
  for (const attempt of rated) {
    const confidence01 = clamp01((attempt.confidence - 1) / 4); // 1..5 -> 0..1
    total += attempt.correct ? confidence01 : 1 - confidence01;
  }
  return clamp01(total / rated.length);
}

/**
 * @param {object} dims
 * @param {number} dims.concept
 * @param {number} dims.accuracy
 * @param {number} dims.speed
 * @param {number} dims.retention
 * @param {number} dims.consistency
 * @param {number} dims.confidence
 * @returns {number} 0..1
 */
export function masteryScore(dims) {
  return clamp01(
    MASTERY_WEIGHTS.concept * clamp01(dims.concept) +
      MASTERY_WEIGHTS.accuracy * clamp01(dims.accuracy) +
      MASTERY_WEIGHTS.speed * clamp01(dims.speed) +
      MASTERY_WEIGHTS.retention * clamp01(dims.retention) +
      MASTERY_WEIGHTS.consistency * clamp01(dims.consistency) +
      MASTERY_WEIGHTS.confidence * clamp01(dims.confidence)
  );
}
