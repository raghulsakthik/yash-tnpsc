/**
 * Phase 28.4 — Test Construction Intelligence. Pure formatting over data
 * Phase 27 already computed and stored (the real blueprint and per-question
 * selection breakdown, persisted in assessment.metadata the moment the
 * test was created) — nothing here recomputes a score, it only explains
 * the real ones that already decided what got picked.
 */

const CATEGORY_LABELS = {
  FOUNDATION: 'foundation topics',
  WEAK_AREAS: 'weak areas',
  REVISION: 'revision',
  ACTUAL_PYQ: 'real past-paper questions',
  INSPIRED_MCQ: 'TNPSC-inspired questions',
  NEW_CONCEPTS: 'new concepts',
};

/**
 * "Why this test?" — the real category breakdown, in the brief's own
 * literal percentage-list shape.
 *
 * @param {object} blueprint the real, stored blueprint (adaptiveTestBlueprint.mjs output)
 */
export function explainBlueprint(blueprint) {
  const lines = Object.entries(blueprint.categories)
    .filter(([, share]) => share > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([category, share]) => `${Math.round(share * 100)}% ${CATEGORY_LABELS[category] ?? category}`);
  return { learnerTier: blueprint.learnerTier, lines, summary: lines.join(', ') };
}

const FACTOR_PHRASES = {
  topicNeed: (v) => (v >= 0.5 ? 'is currently weak' : null),
  prerequisiteRelevance: (v) => (v >= 0.5 ? 'a prerequisite gap makes it relevant right now' : null),
  revisionUrgency: (v) => (v >= 0.5 ? 'it is due (or close to due) for revision' : null),
  misconceptionRelevance: (v) => (v >= 0.5 ? 'a real misconception pattern makes it relevant' : null),
  pyqRelevance: (v) => (v >= 0.9 ? 'it is a real past-paper question' : null),
  novelty: (v) => (v >= 0.8 ? 'she has not recently practiced at this difficulty level' : null),
};

/**
 * "Selected because Percentage is currently weak, the concept is
 * exam-relevant, and the learner has not recently practiced this
 * difficulty level." — built entirely from the real, stored breakdown for
 * this one question.
 *
 * @param {string} topicName
 * @param {object} breakdown scoreQuestionCandidate()'s own stored breakdown for this question
 */
export function explainQuestionSelection(topicName, breakdown) {
  const reasons = Object.entries(FACTOR_PHRASES)
    .map(([factor, describe]) => describe(breakdown[factor] ?? 0))
    .filter(Boolean);

  if (reasons.length === 0) {
    return { reasons: [], summary: `Selected as a well-rounded pick for ${topicName} — no single factor dominated.` };
  }
  const summary = `Selected because ${topicName} ${reasons.join(', and ')}.`;
  return { reasons, summary };
}
