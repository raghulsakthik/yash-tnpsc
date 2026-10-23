/**
 * Phase 27.5 — the Recommendation Engine. Mirrors Phase 11's own
 * "score every candidate in parallel from the same evidence, highest wins"
 * pattern (adaptiveDecision.mjs, unchanged) — generalized here to a wider,
 * explicitly-named action set (RecommendationAction, enums.mjs) and the
 * brief's own eight-factor score. This module only weighs and ranks
 * candidates the service layer builds from real signals (mastery,
 * examWeight, prerequisiteRisk, retention, Phase 14's real historical
 * intervention effectiveness) — it never looks anything up itself.
 */

import { clamp01 } from './accuracy.mjs';

export const RECOMMENDATION_WEIGHTS = {
  learningNeed: 0.2,
  examImportance: 0.15,
  prerequisiteImportance: 0.15,
  retentionUrgency: 0.15,
  expectedLearningGain: 0.15,
  completionProbability: 0.1,
  learnerPreference: 0.05,
  historicalInterventionEffectiveness: 0.05,
};

/**
 * @param {object} candidate {action, target, durationMinutes, difficulty, reason, factors: {...0..1}}
 * @returns {object} candidate with a real confidence attached
 */
export function scoreRecommendationCandidate(candidate) {
  const w = RECOMMENDATION_WEIGHTS;
  const factors = candidate.factors ?? {};
  const score = Object.keys(w).reduce((sum, key) => sum + w[key] * clamp01(factors[key] ?? 0), 0);
  return { ...candidate, factors, confidence: Math.round(score * 1000) / 1000 };
}

/**
 * @param {Array<object>} candidates
 * @returns {{action, target, durationMinutes, difficulty, reason, confidence, factors}|null} the single Next Best Action,
 *   plus every candidate considered (most-confident first), so "why this and not that" is always answerable.
 */
export function selectNextBestAction(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const scored = candidates.map(scoreRecommendationCandidate).sort((a, b) => b.confidence - a.confidence);
  return { ...scored[0], candidates: scored };
}
