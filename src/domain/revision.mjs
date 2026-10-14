/**
 * Spaced repetition. A simplified model on purpose (see the master doc,
 * "revision algorithm") — not SM-2, not yet. Good recall doubles the
 * interval, medium nudges it up, poor halves it. Bounded so a single good
 * review on a weak topic cannot push it out of sight, and a single bad
 * review on a strong topic cannot reset it to zero.
 */

export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 90;

const MULTIPLIER = {
  GOOD: 2,
  MEDIUM: 1.3,
  POOR: 0.5,
};

/** @typedef {'GOOD'|'MEDIUM'|'POOR'} RecallPerformance */

/**
 * How well a revision attempt went, from the same signals the mistake
 * classifier already uses. Confidence is not required: an unrated attempt
 * is judged on correctness and pace alone.
 *
 * @param {object} attempt
 * @param {boolean} attempt.correct
 * @param {number} attempt.timeTakenMs
 * @param {number} attempt.expectedSeconds
 * @param {number|null} [attempt.confidence] 1..5
 * @returns {RecallPerformance}
 */
export function recallPerformance(attempt) {
  const { correct, timeTakenMs, expectedSeconds, confidence } = attempt;

  if (!correct) return 'POOR';

  const seconds = timeTakenMs / 1000;
  const expected = Math.max(1, expectedSeconds);
  const confident = confidence === null || confidence === undefined || confidence >= 3;

  // Correct, at a normal pace or faster, without hesitation: clean recall.
  if (seconds <= expected * 1.5 && confident) return 'GOOD';

  // Correct but slow or unsure: she got there, but it wasn't automatic.
  return 'MEDIUM';
}

/**
 * @param {number} currentIntervalDays
 * @param {RecallPerformance} performance
 * @returns {number} the next interval in days, bounded [1, 90]
 */
export function nextInterval(currentIntervalDays, performance) {
  const multiplier = MULTIPLIER[performance] ?? 1;
  const raw = (currentIntervalDays || MIN_INTERVAL_DAYS) * multiplier;
  return Math.min(MAX_INTERVAL_DAYS, Math.max(MIN_INTERVAL_DAYS, Math.round(raw * 10) / 10));
}

/**
 * @param {Date|string} scheduledAt
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isDue(scheduledAt, now = new Date()) {
  if (!scheduledAt) return false;
  return new Date(scheduledAt).getTime() <= now.getTime();
}

/**
 * Maps a recall performance to the 0..1 value retention_score is smoothed
 * with. GOOD and POOR sit at the extremes; MEDIUM is a real middle, not a
 * midpoint fudge — she did recall it, just not cleanly.
 *
 * @param {RecallPerformance} performance
 * @returns {number} 0..1
 */
export function retentionValue(performance) {
  if (performance === 'GOOD') return 1;
  if (performance === 'MEDIUM') return 0.6;
  return 0.15;
}
