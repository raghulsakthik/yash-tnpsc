// Pure rules for which achievements a learner's real stats qualify for.
// Takes a snapshot of her numbers, returns which achievement ids she has
// earned -- the caller (an API route or the trigger scheduler) diffs that
// against learner_achievement to find what's newly unlocked.

/**
 * @param {object} stats
 * @param {number} stats.questionsSolved
 * @param {number} stats.streak current daily streak
 * @param {number} stats.topicsMastered
 * @param {number} stats.testsCompleted
 * @param {number} stats.bestTestScore 0..100, or 0 if none completed
 * @param {number} stats.mistakesCleared
 * @returns {string[]} achievement ids she currently qualifies for
 */
export function earnedAchievementIds(stats) {
  const earned = [];
  if (stats.questionsSolved >= 1) earned.push('first-step');
  if (stats.streak >= 3) earned.push('streak-3');
  if (stats.streak >= 7) earned.push('streak-7');
  if (stats.streak >= 30) earned.push('streak-30');
  if (stats.questionsSolved >= 100) earned.push('hundred-questions');
  if (stats.questionsSolved >= 500) earned.push('five-hundred-questions');
  if (stats.topicsMastered >= 1) earned.push('first-topic-mastered');
  if (stats.topicsMastered >= 5) earned.push('five-topics-mastered');
  if (stats.testsCompleted >= 1) earned.push('first-test');
  if (stats.bestTestScore >= 80) earned.push('high-scorer');
  if (stats.bestTestScore >= 100) earned.push('clean-sweep');
  if (stats.mistakesCleared >= 10) earned.push('mistake-fixer');
  return earned;
}
