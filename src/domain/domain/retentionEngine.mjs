/**
 * Phase 24 — Retention Engine, the "basic version" the brief explicitly
 * asks for: successful recall + time since recall + difficulty + confidence
 * + mistakes. Deliberately not FSRS/BKT/any complicated model — those are
 * named as later work, after enough learner data exists, not this phase's
 * job.
 *
 * revision.mjs's recallPerformance()/nextInterval()/retentionValue()
 * (unchanged, pre-session) already fold successful recall, difficulty (via
 * expectedSeconds), and confidence into the stored `retention_score`,
 * updated on every REVISION-mode attempt via recordAttempt() (also
 * unchanged). Two dimensions from the brief's basic checklist are missing
 * from that stored number, and are what this module actually adds:
 *
 * - "time since recall": the stored score never moves between revision
 *   attempts — a topic untouched for 60 days still reads at whatever score
 *   it had after its last revision, understating how much she's likely
 *   forgotten since. This module decays it, read-time only, never touching
 *   how the stored value itself is computed or written.
 * - "mistakes": reuses misconceptionRisk() (learnerState.mjs, Phase 6,
 *   unchanged) rather than inventing a second mistake-pattern reader —
 *   a real, recent conceptual gap discounts the effective estimate
 *   further, on top of time decay.
 */

import { clamp01 } from './accuracy.mjs';

export const RETENTION_DECAY_CONFIG = {
  halfLifeDays: 21, // days for the time-decay factor to fall to 0.5, absent any new evidence
  misconceptionPenaltyWeight: 0.3, // how much real misconception risk discounts the effective estimate
};

/**
 * Simple exponential decay toward 0 as days-since-last-studied grows. No
 * elapsed-time evidence at all (never studied, or unknown) doesn't
 * penalize — there's nothing to decay from.
 */
export function timeDecayFactor(daysSinceLastStudied, halfLifeDays = RETENTION_DECAY_CONFIG.halfLifeDays) {
  if (daysSinceLastStudied === null || daysSinceLastStudied === undefined) return 1;
  return Math.pow(0.5, daysSinceLastStudied / halfLifeDays);
}

/**
 * The effective retention estimate a decision should actually use: the
 * stored score, decayed by elapsed time, further discounted by any real
 * misconception risk in her recent mistakes on this topic.
 *
 * @param {object} input
 * @param {number} input.storedRetention retention_score as persisted (revision.mjs, unchanged)
 * @param {number|null} input.daysSinceLastStudied
 * @param {number} [input.misconceptionRisk] 0..1, from learnerState.mjs (Phase 6, unchanged)
 * @returns {{effective: number, storedRetention: number, decayFactor: number, daysSinceLastStudied: number|null, misconceptionRisk: number}}
 */
export function estimateEffectiveRetention({ storedRetention, daysSinceLastStudied, misconceptionRisk = 0 }) {
  const decayFactor = timeDecayFactor(daysSinceLastStudied);
  const decayed = clamp01(storedRetention * decayFactor);
  const effective = clamp01(decayed * (1 - RETENTION_DECAY_CONFIG.misconceptionPenaltyWeight * misconceptionRisk));

  return {
    effective: Math.round(effective * 1000) / 1000,
    storedRetention,
    decayFactor: Math.round(decayFactor * 1000) / 1000,
    daysSinceLastStudied,
    misconceptionRisk,
  };
}
