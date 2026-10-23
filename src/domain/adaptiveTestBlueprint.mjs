/**
 * Phase 27.1 — Adaptive Test Blueprint. The literal category split and
 * difficulty distributions the brief names are the configured starting
 * point, not hardcoded destiny: a category with genuinely nothing real to
 * serve (no revision due, no PYQ content for her current topics — Phase 26
 * already makes "no inspired content exists" a permanent fact in this
 * environment) has its share honestly redistributed rather than reserved
 * for content that doesn't exist, which the question-selection step would
 * otherwise fail to fill.
 */

import { clamp01 } from './accuracy.mjs';

export const ADAPTIVE_TEST_BLUEPRINT_CONFIG = {
  baseCategoryWeights: {
    FOUNDATION: 0.2,
    WEAK_AREAS: 0.25,
    REVISION: 0.15,
    ACTUAL_PYQ: 0.2,
    INSPIRED_MCQ: 0.1,
    NEW_CONCEPTS: 0.1,
  },
  strongMasteryFloor: 0.75,
  strugglingMasteryCeiling: 0.4,
  difficultyDistributions: {
    STRONG: { EASY: 0.1, MEDIUM: 0.5, HARD: 0.3, EXPERT: 0.1 },
    DEVELOPING: { EASY: 0.25, MEDIUM: 0.5, HARD: 0.2, EXPERT: 0.05 },
    STRUGGLING: { EASY: 0.4, MEDIUM: 0.45, HARD: 0.15, EXPERT: 0 },
  },
  defaultQuestionCount: 20,
};

export function classifyLearnerTier(averageMastery, cfg = ADAPTIVE_TEST_BLUEPRINT_CONFIG) {
  if (averageMastery === null || averageMastery === undefined) return 'DEVELOPING'; // no evidence yet — neither extreme
  if (averageMastery >= cfg.strongMasteryFloor) return 'STRONG';
  if (averageMastery <= cfg.strugglingMasteryCeiling) return 'STRUGGLING';
  return 'DEVELOPING';
}

// Redistributes one category's weight proportionally across the rest,
// rather than just dropping it — the remaining categories keep their
// *relative* shape, not an arbitrary new split.
function redistribute(weights, deadKey) {
  const dead = weights[deadKey];
  if (!dead) return weights;
  const alive = Object.keys(weights).filter((k) => k !== deadKey && weights[k] > 0);
  const aliveTotal = alive.reduce((s, k) => s + weights[k], 0);
  const next = { ...weights, [deadKey]: 0 };
  if (aliveTotal > 0) {
    for (const k of alive) next[k] += dead * (weights[k] / aliveTotal);
  }
  return next;
}

/**
 * @param {object} evidence
 * @param {number|null} evidence.averageMastery across her touched topics (Phase 6's getLearnerSummary, unchanged)
 * @param {boolean} evidence.hasRevisionDue real revision_schedule evidence (Phase 11's isRevisionDue, unchanged)
 * @param {boolean} evidence.hasPyqContent real PYQ content exists for her current topics (Phase 26, unchanged)
 * @param {boolean} evidence.hasInspiredContent real published generated_question rows exist (Phase 26 — always false here)
 * @param {number} [evidence.questionCount]
 */
export function buildAdaptiveTestBlueprint({ averageMastery, hasRevisionDue, hasPyqContent, hasInspiredContent, questionCount }, cfg = ADAPTIVE_TEST_BLUEPRINT_CONFIG) {
  const tier = classifyLearnerTier(averageMastery, cfg);
  const count = questionCount ?? cfg.defaultQuestionCount;

  let weights = { ...cfg.baseCategoryWeights };
  if (!hasRevisionDue) weights = redistribute(weights, 'REVISION');
  if (!hasPyqContent) weights = redistribute(weights, 'ACTUAL_PYQ');
  if (!hasInspiredContent) weights = redistribute(weights, 'INSPIRED_MCQ');

  const total = Object.values(weights).reduce((s, w) => s + w, 0) || 1;
  const categories = {};
  const categoryQuestionCounts = {};
  let allocated = 0;
  const keys = Object.keys(weights);
  for (const [i, key] of keys.entries()) {
    const share = clamp01(weights[key] / total);
    categories[key] = Math.round(share * 1000) / 1000;
    // Every category but the last gets a floor-rounded share; the last
    // absorbs the remainder so the real question count always matches
    // count exactly, never off by a rounding error.
    const n = i === keys.length - 1 ? count - allocated : Math.round(share * count);
    categoryQuestionCounts[key] = Math.max(0, n);
    allocated += categoryQuestionCounts[key];
  }

  return {
    learnerTier: tier,
    questionCount: count,
    categories,
    categoryQuestionCounts,
    difficultyDistribution: cfg.difficultyDistributions[tier],
  };
}
