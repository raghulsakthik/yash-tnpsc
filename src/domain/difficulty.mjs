/**
 * Difficulty adaptation.
 *
 * Difficulty is a number 0..1 internally, not EASY/MEDIUM/HARD, so adaptation
 * can be gradual. Bands exist only for display.
 *
 * Rules, in priority order:
 *   1. Three consecutive wrong  -> drop hard and check the prerequisite.
 *   2. Accuracy below 0.50      -> step down 0.10.
 *   3. Accuracy above 0.85 and reasonable speed -> step up 0.05.
 *   4. Otherwise hold.
 *
 * Steps are small on purpose. A learner who gets three right should not be
 * thrown an expert question; that is how people quit.
 */

import { clamp01 } from './accuracy.mjs';

export const STEP_UP = 0.05;
export const STEP_DOWN = 0.1;
export const FLOOR = 0.1;
export const CEILING = 0.95;
export const STRUGGLE_STREAK = 3;

/** @typedef {'PRACTICE'|'EASIER_QUESTION'|'HARDER_QUESTION'|'REVIEW_PREREQUISITE'} NextAction */

/**
 * @param {object} state
 * @param {number} state.currentDifficulty
 * @param {number} state.accuracy          recency weighted, 0..1
 * @param {number} state.speed             0..1
 * @param {number} state.consecutiveWrong
 * @param {number} state.attemptCount
 * @returns {{difficulty: number, nextAction: NextAction, reason: string}}
 */
export function adaptDifficulty(state) {
  const { currentDifficulty, accuracy, speed, consecutiveWrong, attemptCount } = state;

  if (consecutiveWrong >= STRUGGLE_STREAK) {
    return {
      difficulty: bounded(currentDifficulty - STEP_DOWN * 1.5),
      nextAction: 'REVIEW_PREREQUISITE',
      reason: `${consecutiveWrong} wrong in a row`,
    };
  }

  // Below this, the accuracy estimate is noise. Hold and gather evidence.
  if (attemptCount < 5) {
    return {
      difficulty: bounded(currentDifficulty),
      nextAction: 'PRACTICE',
      reason: 'not enough attempts to adapt yet',
    };
  }

  if (accuracy < 0.5) {
    return {
      difficulty: bounded(currentDifficulty - STEP_DOWN),
      nextAction: 'EASIER_QUESTION',
      reason: `accuracy ${pct(accuracy)} is below 50%`,
    };
  }

  if (accuracy > 0.85 && speed >= 0.4) {
    return {
      difficulty: bounded(currentDifficulty + STEP_UP),
      nextAction: 'HARDER_QUESTION',
      reason: `accuracy ${pct(accuracy)} with speed holding`,
    };
  }

  if (accuracy > 0.85 && speed < 0.4) {
    return {
      difficulty: bounded(currentDifficulty),
      nextAction: 'PRACTICE',
      reason: 'accurate but slow — hold difficulty and build speed',
    };
  }

  return {
    difficulty: bounded(currentDifficulty),
    nextAction: 'PRACTICE',
    reason: `accuracy ${pct(accuracy)} is in the working range`,
  };
}

const BIAS_OFFSET = { gentle: -0.1, normal: 0, hard: 0.1 };

/**
 * Shifts a target difficulty by the learner's stored preference
 * (learner_profile.difficulty_bias) before question selection. A
 * preference, not an adaptation rule — adaptDifficulty() itself is
 * untouched; this only moves the starting point it adapts from.
 */
export function applyDifficultyBias(targetDifficulty, bias) {
  return bounded(targetDifficulty + (BIAS_OFFSET[bias] ?? 0));
}

/** Display band. Never used for adaptation. */
export function difficultyBand(difficulty) {
  if (difficulty < 0.35) return 'EASY';
  if (difficulty < 0.6) return 'MEDIUM';
  if (difficulty < 0.8) return 'HARD';
  return 'EXPERT';
}

function bounded(value) {
  return Math.min(CEILING, Math.max(FLOOR, round2(clamp01(value))));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function pct(value) {
  return `${Math.round(value * 100)}%`;
}
