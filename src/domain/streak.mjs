/**
 * Learning streaks. A day counts if at least one question_attempt row
 * exists on it — real activity, not an app-open. Pure over a list of
 * dates so it's testable without a clock or a database.
 */

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

function daysBetween(a, b) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / MS_PER_DAY);
}

/**
 * @param {Array<string|Date>} attemptDates one entry per attempt (or per day — duplicates collapse)
 * @param {Date} [now]
 * @returns {{current: number, longest: number}}
 */
export function computeStreak(attemptDates, now = new Date()) {
  const uniqueDays = [...new Set(attemptDates.map(dayKey))].sort();
  if (uniqueDays.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i += 1) {
    run = daysBetween(uniqueDays[i], uniqueDays[i - 1]) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // Current streak: the run ending on the most recent attempt day, but
  // only "alive" if that day is today or yesterday — two days of silence
  // and it's broken, not just paused.
  const today = dayKey(now);
  const lastDay = uniqueDays[uniqueDays.length - 1];
  const gapToToday = daysBetween(today, lastDay);
  if (gapToToday > 1) return { current: 0, longest };

  let current = 1;
  for (let i = uniqueDays.length - 1; i > 0; i -= 1) {
    if (daysBetween(uniqueDays[i], uniqueDays[i - 1]) === 1) current += 1;
    else break;
  }
  return { current, longest };
}
