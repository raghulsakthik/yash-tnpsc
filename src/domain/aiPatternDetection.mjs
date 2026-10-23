/**
 * Phase 30.1 — AI Learner Pattern Detection. The brief's own constraint:
 * "The deterministic system remains authoritative; AI helps identify
 * patterns and explanations." So the pattern-detection logic itself is
 * deterministic, pure, and reuses thresholds other phases already
 * established — Phase 28's speed/accuracy quadrant config, Phase 25's
 * prerequisite-risk floor — never a new, invented threshold. The AI layer
 * (aiTutorService.mjs, via INTERPRET_PATTERNS) only narrates what this
 * function already decided.
 */

import { classifySpeedAccuracyQuadrant, SPEED_ACCURACY_CONFIG } from './learnerAnalytics.mjs';
import { COMPLETION_VERDICT_CONFIG } from './completionCriteria.mjs';

export const PATTERN_DETECTION_CONFIG = {
  misconceptionRiskFloor: 0.4, // reused from AdaptiveAction's own REPEAT_LESSON trigger (adaptiveDecision.mjs)
  retentionDecayFloor: 0.5, // reused from completionCriteria.mjs's own REVISE trigger
};

/**
 * @param {object} signals real, already-computed topic-level signals
 * @param {number} signals.accuracy
 * @param {number} signals.speed
 * @param {number} signals.misconceptionRisk
 * @param {number} signals.prerequisiteRisk
 * @param {number} signals.storedRetention
 * @param {number|null} signals.effectiveRetention
 * @param {'OVERCONFIDENT'|'UNDERCONFIDENT'|null} signals.confidenceIssue
 * @returns {Array<{pattern: string, reason: string}>}
 */
export function detectTopicPatterns(signals) {
  const cfg = PATTERN_DETECTION_CONFIG;
  const patterns = [];

  if (signals.misconceptionRisk >= cfg.misconceptionRiskFloor) {
    patterns.push({ pattern: 'POSSIBLE_MISCONCEPTION', reason: `repeated wrong answers read as a real conceptual gap (misconception risk ${signals.misconceptionRisk.toFixed(2)}), not slips.` });
  }
  if (signals.confidenceIssue === 'OVERCONFIDENT') {
    patterns.push({ pattern: 'OVERCONFIDENCE', reason: 'confident and wrong often enough to be a real pattern — she will not know to double-check.' });
  }
  if (signals.confidenceIssue === 'UNDERCONFIDENT') {
    patterns.push({ pattern: 'UNDERCONFIDENCE', reason: 'unsure but right often enough to be a real pattern — she knows more than she thinks.' });
  }
  if (classifySpeedAccuracyQuadrant(signals.speed, signals.accuracy) === 'SPEED_TRAINING') {
    patterns.push({ pattern: 'SPEED_LIMITATION', reason: `real accuracy is high but real speed is slow (below ${SPEED_ACCURACY_CONFIG.fastSpeedFloor}) — she knows it, pacing is the real gap.` });
  }
  if (signals.storedRetention > 0 && signals.effectiveRetention !== null && signals.effectiveRetention < cfg.retentionDecayFloor) {
    patterns.push({ pattern: 'KNOWLEDGE_DECAY', reason: `a real, previously-tracked retention score has decayed to ${signals.effectiveRetention.toFixed(2)} since it was last practiced.` });
  }
  if (signals.prerequisiteRisk >= COMPLETION_VERDICT_CONFIG.prerequisiteRiskStrengthenFloor) {
    patterns.push({ pattern: 'FOUNDATION_WEAKNESS', reason: `a real, unmastered prerequisite (risk ${signals.prerequisiteRisk.toFixed(2)}) keeps resurfacing as the real cause.` });
  }

  return patterns;
}
