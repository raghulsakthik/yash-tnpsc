/**
 * Turns a topic's raw learner_topic_state (+ whether a revision is due)
 * into one of the eight display states the web design uses. Pure and
 * testable on purpose — every page that shows topic progress (Learn,
 * Subject, Journey) goes through this instead of re-deriving its own rules.
 */

import { dateKeyInAppTimezone } from '../lib/timezone.mjs';

/** @typedef {'not-started'|'learning'|'practising'|'near-mastery'|'mastered'|'revision-due'|'retained'} TopicStatus */

const MASTERED_THRESHOLD = 0.85;
const NEAR_MASTERY_THRESHOLD = 0.7;
const PRACTISING_THRESHOLD = 0.35;
const RETAINED_INTERVAL_DAYS = 30;

/**
 * @param {object} input
 * @param {number} input.attemptCount
 * @param {number} input.masteryScore 0..1
 * @param {boolean} input.revisionDue
 * @param {number|null} [input.intervalDays] current spaced-repetition interval, if a schedule exists
 * @returns {TopicStatus}
 */
export function topicStatus({ attemptCount, masteryScore, revisionDue, intervalDays = null }) {
  if (attemptCount === 0) return 'not-started';
  if (revisionDue) return 'revision-due';
  if (masteryScore >= MASTERED_THRESHOLD) {
    return intervalDays !== null && intervalDays >= RETAINED_INTERVAL_DAYS ? 'retained' : 'mastered';
  }
  if (masteryScore >= NEAR_MASTERY_THRESHOLD) return 'near-mastery';
  if (masteryScore >= PRACTISING_THRESHOLD) return 'practising';
  return 'learning';
}

/**
 * Current daily streak from a learner's active dates: walk back day by day
 * from today (today itself doesn't break the streak if empty -- she just
 * hasn't studied yet today) until a day with no activity is found.
 *
 * @param {string[]} activeDates ISO 'YYYY-MM-DD' strings, any order
 * @returns {number}
 */
export function computeStreak(activeDates) {
  const days = new Set(activeDates);
  const cursor = new Date();
  // "Today" means her IST calendar day -- not .toISOString().slice(0, 10),
  // which converts through UTC first and silently shifts midnight back a
  // calendar day in any positive-UTC-offset timezone, and not the server's
  // ambient local time either (a cloud host typically defaults to UTC).
  // `activeDates` are real 'YYYY-MM-DD' strings straight from a Postgres
  // DATE column bucketed the same way (see the AT TIME ZONE clauses
  // alongside src/lib/timezone.mjs) -- both sides of every `days.has(...)`
  // check have to agree on the same calendar or the streak silently breaks.
  if (!days.has(dateKeyInAppTimezone(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(dateKeyInAppTimezone(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Longest daily streak ever achieved from a learner's active dates.
 * @param {string[]} activeDates ISO 'YYYY-MM-DD' strings, any order
 * @returns {number}
 */
export function longestStreak(activeDates) {
  const days = [...new Set(activeDates)].sort();
  let longest = 0;
  let current = 0;
  let prev = null;
  for (const day of days) {
    if (prev) {
      const gapDays = (new Date(day) - new Date(prev)) / 86_400_000;
      current = gapDays === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    prev = day;
  }
  return longest;
}

/** The Journey orbit's five rings, coarser than the eight display states. */
export function orbitRing(status) {
  switch (status) {
    case 'mastered':
    case 'retained':
      return 'mastered';
    case 'near-mastery':
    case 'practising':
      return 'learning';
    case 'revision-due':
      return 'drifting';
    case 'learning':
      return 'struggling';
    default:
      return 'unmet';
  }
}
