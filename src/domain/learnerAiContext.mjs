/**
 * Phase 29.3 — Personalized Learner Context. The brief's own literal JSON
 * shape, built entirely from real, already-computed signals (Phase 6's
 * digital twin, Phase 1's mastery dimensions, Phase 11's revenueDue/
 * classification). This is read-only context handed TO the AI — nothing
 * here, or anything that consumes it, writes back to learner_topic_state.
 */

function difficultyLabel(mastery) {
  if (mastery >= 0.7) return 'hard';
  if (mastery >= 0.4) return 'medium';
  return 'easy';
}

function performanceLabel(accuracy) {
  if (accuracy >= 0.75) return 'strong';
  if (accuracy >= 0.5) return 'developing';
  return 'weak';
}

/**
 * @param {object} input
 * @param {string} input.topicId
 * @param {number} input.mastery 0..1
 * @param {number} input.accuracy 0..1
 * @param {string|null} input.recentMistakeType real mistakeType from her most recent wrong attempt, or null
 * @param {number|null} input.confidence 1..5, her most recent real confidence rating, or null
 * @param {'simple'|'detailed'} [input.preferredExplanation] a real, stated preference if one exists — never guessed
 */
export function buildLearnerAiContext({ topicId, mastery, accuracy, recentMistakeType, confidence, preferredExplanation }) {
  return {
    currentTopic: topicId,
    mastery: Math.round(mastery * 1000) / 1000,
    recentMistake: recentMistakeType,
    difficulty: difficultyLabel(mastery),
    confidence: confidence ?? null,
    recentPerformance: performanceLabel(accuracy),
    // No real preference-tracking exists in this system yet (same honesty
    // as Phase 27's recommendation engine) — 'simple' is a stated,
    // explicit default, not a measured preference.
    preferredExplanation: preferredExplanation ?? 'simple',
  };
}
