/**
 * Turns a topic's raw learner_topic_state (+ whether a revision is due)
 * into one of the eight display states the web design uses. Pure and
 * testable on purpose — every page that shows topic progress (Learn,
 * Subject, Journey) goes through this instead of re-deriving its own rules.
 */

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
