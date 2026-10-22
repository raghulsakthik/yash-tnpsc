/**
 * Recency-weighted accuracy.
 *
 * Plain correct/total is useless for an adaptive system: after 200 attempts a
 * learner who has just understood the topic still reads as 55% and the engine
 * keeps feeding her easy questions. Weighting by recency makes the model
 * responsive to what she can do *now*.
 *
 * weight = e^(-lambda * ageInAttempts)
 * accuracy = sum(correct * weight) / sum(weight)
 *
 * lambda 0.15 means an attempt ~5 attempts ago counts about half as much as the
 * latest one. It is a starting value, not a discovered constant.
 */

export const DEFAULT_LAMBDA = 0.15;

/**
 * @param {Array<{correct: boolean}>} attempts newest first
 * @param {number} lambda decay constant, larger forgets faster
 * @returns {number} 0..1, or 0 when there are no attempts
 */
export function weightedAccuracy(attempts, lambda = DEFAULT_LAMBDA) {
  if (!Array.isArray(attempts) || attempts.length === 0) return 0;

  let numerator = 0;
  let denominator = 0;

  for (let age = 0; age < attempts.length; age += 1) {
    const weight = Math.exp(-lambda * age);
    denominator += weight;
    if (attempts[age].correct) numerator += weight;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Speed, scored only where accuracy holds up.
 *
 * A fast wrong answer is a guess, not speed, so incorrect attempts score 0
 * rather than dragging the ratio up. The ratio is clamped to 2 so that one
 * lucky instant answer cannot dominate.
 *
 * @param {Array<{correct: boolean, timeTakenMs: number, expectedSeconds: number}>} attempts
 * @returns {number} 0..1
 */
export function speedScore(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) return 0;

  const correct = attempts.filter((a) => a.correct && a.timeTakenMs > 0);
  if (correct.length === 0) return 0;

  let total = 0;
  for (const attempt of correct) {
    const expectedMs = Math.max(1, attempt.expectedSeconds * 1000);
    const ratio = Math.min(2, expectedMs / attempt.timeTakenMs);
    total += ratio;
  }

  // ratio 1 (bang on expected time) maps to 0.5; ratio 2 maps to 1.
  return clamp01(total / correct.length / 2);
}

/** @param {number} value */
export function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
