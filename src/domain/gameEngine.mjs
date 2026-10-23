/**
 * Phase 22 — the Subject-Specific Game Engine's scoring logic. One engine:
 * every game is the same "speed round" mechanic (answer quickly and
 * accurately, build a streak) over whatever topics/difficulty/scoring a
 * GameDefinition configures — a new game is a new config row, never new
 * code. Correctness itself is never computed here — the service layer
 * grades every question through the existing, unchanged recordAttempt()
 * pipeline; this module only turns that correctness plus timing into
 * points.
 */

export const DEFAULT_SCORING_CONFIG = Object.freeze({
  pointsPerCorrect: 10,
  speedBonusMax: 5,
  streakBonusPerStreak: 2,
  streakBonusCap: 10,
});

/**
 * Scores one answered question. A wrong answer earns nothing and resets
 * the streak; a correct one earns a base score plus a speed bonus (faster
 * than the question's own estimated_seconds) plus a streak bonus (capped,
 * so a long streak can't dominate the score indefinitely).
 *
 * @param {object} input
 * @param {boolean} input.correct
 * @param {number} input.timeTakenMs
 * @param {number} input.estimatedSeconds
 * @param {number} input.currentStreak streak going into this question
 * @param {object} [input.scoringConfig]
 * @returns {{points: number, streak: number}}
 */
export function scoreGameAttempt({ correct, timeTakenMs, estimatedSeconds, currentStreak, scoringConfig = DEFAULT_SCORING_CONFIG }) {
  if (!correct) return { points: 0, streak: 0 };

  const expectedMs = Math.max(1, estimatedSeconds * 1000);
  const speedRatio = Math.min(2, expectedMs / Math.max(1, timeTakenMs)); // > 1 means faster than expected
  const speedBonus = Math.round(scoringConfig.speedBonusMax * Math.max(0, speedRatio - 1));

  const streak = currentStreak + 1;
  const streakBonus = Math.min(scoringConfig.streakBonusCap, streak * scoringConfig.streakBonusPerStreak);

  return { points: scoringConfig.pointsPerCorrect + speedBonus + streakBonus, streak };
}

/**
 * Scores a whole session from its per-question results, in answer order
 * (streak only makes sense as a running sequence).
 *
 * @param {Array<{questionId: string, correct: boolean, timeTakenMs: number, estimatedSeconds: number}>} results
 * @param {object} [scoringConfig]
 * @returns {{totalScore: number, perQuestion: Array<object>, correctCount: number, questionCount: number}}
 */
export function scoreGameSession(results, scoringConfig = DEFAULT_SCORING_CONFIG) {
  let streak = 0;
  let totalScore = 0;
  const perQuestion = [];

  for (const r of results) {
    const { points, streak: nextStreak } = scoreGameAttempt({ ...r, currentStreak: streak, scoringConfig });
    streak = nextStreak;
    totalScore += points;
    perQuestion.push({ questionId: r.questionId, correct: r.correct, points });
  }

  return {
    totalScore,
    perQuestion,
    correctCount: results.filter((r) => r.correct).length,
    questionCount: results.length,
  };
}
