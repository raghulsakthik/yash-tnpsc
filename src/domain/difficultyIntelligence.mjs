/**
 * Phase 26.6 — Question Difficulty Intelligence, the "improve using actual
 * performance" half. Initial difficulty (concept complexity + expected
 * solving time + number of steps) is already the real, authored
 * `question.difficulty`/`estimated_seconds` — a human judgment, unchanged.
 * This module only computes a *suggested* delta from real attempt
 * evidence, never overwrites the authored value — the brief is explicit
 * that true IRT/Elo calibration is later work, not this phase's job.
 *
 * Honesty caveat, load-bearing for every caller: this is a single-tenant
 * system (one real LEARNER_ID). "Population performance" here can only
 * ever honestly mean this one learner's historical performance on this
 * question, not a real population — every response names that plainly.
 */

export const DIFFICULTY_INTELLIGENCE_CONFIG = {
  minAttemptsForSignal: 3, // fewer than this and the signal isn't trustworthy yet
  accuracyEasyFloor: 0.8, // accuracy at/above this reads as "easier than authored" (if difficulty wasn't already low)
  accuracyHardCeiling: 0.3, // accuracy at/below this reads as "harder than authored"
  maxSuggestedDelta: 0.2, // never suggest moving difficulty by more than this in one pass
};

/**
 * @param {object} input
 * @param {number} input.authoredDifficulty 0..1
 * @param {number} input.attemptCount
 * @param {number} input.accuracy 0..1
 * @param {number} input.skipRate 0..1 (selected_index IS NULL / attemptCount)
 * @param {number} input.hintRate 0..1 (hint_used / attemptCount)
 * @returns {{suggestedDifficulty: number, delta: number, confidence: 'NONE'|'LOW'|'MODERATE', reason: string}}
 */
export function suggestDifficultyAdjustment({ authoredDifficulty, attemptCount, accuracy, skipRate, hintRate }) {
  const cfg = DIFFICULTY_INTELLIGENCE_CONFIG;

  if (attemptCount < cfg.minAttemptsForSignal) {
    return {
      suggestedDifficulty: authoredDifficulty,
      delta: 0,
      confidence: 'NONE',
      reason: `only ${attemptCount} real attempt(s) so far — not enough evidence to suggest anything`,
    };
  }

  // Struggling signals (low accuracy, high skip/hint reliance) push the
  // suggestion up; a comfortably high accuracy with little struggle pushes
  // it down. Neither overrides the other — they're read together.
  const struggleScore = (1 - accuracy) * 0.6 + skipRate * 0.2 + hintRate * 0.2;
  let rawDelta = 0;
  let reason;

  if (accuracy <= cfg.accuracyHardCeiling) {
    rawDelta = struggleScore * cfg.maxSuggestedDelta;
    reason = `real accuracy is only ${Math.round(accuracy * 100)}% across ${attemptCount} attempts — this reads harder than its authored difficulty`;
  } else if (accuracy >= cfg.accuracyEasyFloor && skipRate < 0.2 && hintRate < 0.2) {
    rawDelta = -(1 - struggleScore) * cfg.maxSuggestedDelta;
    reason = `real accuracy is ${Math.round(accuracy * 100)}% across ${attemptCount} attempts with little skipping or hint use — this reads easier than its authored difficulty`;
  } else {
    return {
      suggestedDifficulty: authoredDifficulty,
      delta: 0,
      confidence: 'LOW',
      reason: `real performance (${Math.round(accuracy * 100)}% accuracy) is within the normal range for its authored difficulty — no adjustment suggested`,
    };
  }

  const clampedDelta = Math.max(-cfg.maxSuggestedDelta, Math.min(cfg.maxSuggestedDelta, rawDelta));
  const suggested = Math.max(0, Math.min(1, authoredDifficulty + clampedDelta));

  return {
    suggestedDifficulty: Math.round(suggested * 100) / 100,
    delta: Math.round(clampedDelta * 100) / 100,
    confidence: attemptCount >= cfg.minAttemptsForSignal * 3 ? 'MODERATE' : 'LOW',
    reason,
  };
}
