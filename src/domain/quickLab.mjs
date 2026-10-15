/**
 * Quick Lab: the bank-backed modes only (Percentage Rush, Fraction Lab).
 * These are the existing question bank under a timer — same topics, same
 * MCQ questions, same selection/grading engines as Practice. The six
 * procedurally-generated arcade modes (Quick Math, Number Rush, ...) are
 * out of scope here; they need a content-generation engine this doesn't
 * provide.
 */

export const QUICK_LAB_MODES = {
  'percentage-rush': { topicId: 'aptitude.percentage', name: 'Percentage Rush', roundLength: 10 },
  'fraction-lab': { topicId: 'aptitude.fractions', name: 'Fraction Lab', roundLength: 10 },
};

/**
 * A correct answer extends the streak; a miss resets it to zero.
 * @param {boolean} wasCorrect
 * @param {number} currentCombo
 */
export function nextCombo(wasCorrect, currentCombo) {
  return wasCorrect ? currentCombo + 1 : 0;
}
