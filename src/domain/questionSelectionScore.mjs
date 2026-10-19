/**
 * Phase 27.2 — the Question Selection Engine's explicit multi-factor score.
 * difficultyFit/novelty/examRelevance are selection.mjs's own, unchanged
 * (Phase 1) — reused directly, not reimplemented. pyqRelevance reuses
 * examRelevance() too: "is this a real past-paper question" is the exact
 * same real signal both names point at. The remaining four factors
 * (topicNeed, revisionUrgency, misconceptionRelevance, prerequisiteRelevance)
 * are passed in already computed by callers from existing, unchanged
 * sources (learnerState.mjs's misconceptionRisk/prerequisiteRisk,
 * retentionEngine.mjs's effective retention, adaptiveDecisionRepository's
 * isRevisionDue) — this module only weighs and sums them, never
 * re-derives what they mean.
 */

import { difficultyFit, novelty, examRelevance } from './selection.mjs';
import { clamp01 } from './accuracy.mjs';

export const QUESTION_SELECTION_WEIGHTS = {
  topicNeed: 0.2,
  difficultyFit: 0.2,
  revisionUrgency: 0.15,
  examRelevance: 0.1,
  misconceptionRelevance: 0.1,
  novelty: 0.1,
  prerequisiteRelevance: 0.1,
  pyqRelevance: 0.05,
};

/**
 * @param {object} candidate {difficulty, source, seenCount, attemptsSinceLastSeen}
 * @param {object} context {targetDifficulty, topicNeed, revisionUrgency, misconceptionRelevance, prerequisiteRelevance}
 * @returns {{score: number, breakdown: object}}
 */
export function scoreQuestionCandidate(candidate, context) {
  const w = QUESTION_SELECTION_WEIGHTS;
  const breakdown = {
    topicNeed: clamp01(context.topicNeed ?? 0),
    difficultyFit: difficultyFit(candidate.difficulty, context.targetDifficulty),
    revisionUrgency: clamp01(context.revisionUrgency ?? 0),
    examRelevance: examRelevance(candidate.source),
    misconceptionRelevance: clamp01(context.misconceptionRelevance ?? 0),
    novelty: novelty(candidate.seenCount ?? 0, candidate.attemptsSinceLastSeen ?? 0),
    prerequisiteRelevance: clamp01(context.prerequisiteRelevance ?? 0),
    pyqRelevance: examRelevance(candidate.source),
  };

  const score = Object.keys(w).reduce((sum, key) => sum + w[key] * breakdown[key], 0);
  return { score: Math.round(score * 1000) / 1000, breakdown };
}

/**
 * @param {Array<object>} candidates
 * @param {object} context
 * @returns {object|null} the highest-scoring candidate, with score/breakdown attached
 */
export function selectBestQuestion(candidates, context) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  let best = null;
  for (const candidate of candidates) {
    const { score, breakdown } = scoreQuestionCandidate(candidate, context);
    if (!best || score > best.score) best = { ...candidate, score, breakdown };
  }
  return best;
}
