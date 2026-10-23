/**
 * Mistake classification, deterministic rules only.
 *
 * The point is not a perfect taxonomy. The point is that "wrong" is not one
 * thing: a careless slip and a conceptual gap need opposite responses, and the
 * engine cannot tell them apart without this.
 *
 * AI can refine these later. It does not get to overwrite them.
 */

/** @typedef {'CARELESS'|'CONCEPTUAL'|'GUESS'|'TIME_PRESSURE'|'OVERCONFIDENT'|'UNKNOWN'} MistakeType */

export const GUESS_SECONDS = 5;

/**
 * @param {object} attempt
 * @param {boolean} attempt.correct
 * @param {number} attempt.timeTakenMs
 * @param {number} attempt.expectedSeconds
 * @param {number|null} attempt.confidence 1..5
 * @param {number} attempt.topicAccuracy   0..1, before this attempt
 * @returns {MistakeType|null} null when the answer was correct
 */
export function classifyMistake(attempt) {
  if (attempt.correct) return null;

  const seconds = attempt.timeTakenMs / 1000;
  const expected = Math.max(1, attempt.expectedSeconds);
  const { confidence, topicAccuracy } = attempt;

  // Answered faster than anyone could read it: she picked something to move on.
  if (seconds < GUESS_SECONDS) return 'GUESS';

  // Sure of herself and wrong. This is the dangerous one — she will not look it
  // up, because she does not know she is wrong. Needs an intervention, not a
  // harder question.
  if (confidence !== null && confidence !== undefined && confidence >= 4) {
    return 'OVERCONFIDENT';
  }

  // Took far longer than expected: she was working, not guessing, and ran out
  // of road. That is a method problem, not carelessness.
  if (seconds > expected * 2.5) return 'TIME_PRESSURE';

  // Strong on the topic overall but missed this one in a normal amount of time.
  if (topicAccuracy >= 0.75) return 'CARELESS';

  // Weak on the topic and wrong at a normal pace: she does not have it yet.
  if (topicAccuracy < 0.5) return 'CONCEPTUAL';

  return 'UNKNOWN';
}

/**
 * What to do about each kind of mistake. Deterministic, so the app still
 * teaches when no AI provider is reachable.
 *
 * @param {MistakeType} type
 * @returns {{action: string, message: string}}
 */
export function interventionFor(type) {
  switch (type) {
    case 'GUESS':
      return {
        action: 'RETRY_SAME',
        message: 'That was quick — have a proper go at this one before moving on.',
      };
    case 'OVERCONFIDENT':
      return {
        action: 'SHOW_EXPLANATION',
        message: 'This one is worth reading carefully — the obvious answer is not the right one here.',
      };
    case 'TIME_PRESSURE':
      return {
        action: 'SHOW_METHOD',
        message: 'You had the right idea but it took a while. Here is the shorter route.',
      };
    case 'CARELESS':
      return {
        action: 'CONTINUE',
        message: 'You know this one — just a slip. Keep going.',
      };
    case 'CONCEPTUAL':
      return {
        action: 'REVIEW_PREREQUISITE',
        message: 'Let us go back a step before trying more of these.',
      };
    default:
      return { action: 'SHOW_EXPLANATION', message: 'Here is how this one works.' };
  }
}
