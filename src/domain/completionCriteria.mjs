/**
 * Phase 25 — Completion Criteria, the piece the consolidated 25-29 brief
 * calls out explicitly: a topic is not complete merely because content was
 * consumed. This module turns everything already known about a topic
 * (mastery, accuracy, speed, retention, confidence, consistency,
 * prerequisite satisfaction, assessment performance) into exactly the
 * brief's six-value verdict: CONTINUE, STRENGTHEN, REVISE, REASSESS,
 * MASTERED, RETAINED.
 *
 * Deliberately not a new scoring model. Every dimension is read from
 * modules that already compute it:
 *
 * - mastery/concept/accuracy/speed/retention/confidence/consistency and the
 *   mastery-vs-assessment contradiction check: evaluateMasteryGate()
 *   (masteryGate.mjs, Phase 13, unchanged) — MASTERED/RETAINED are its own
 *   literal output values, passed straight through.
 * - prerequisite satisfaction: prerequisiteRisk (learnerState.mjs, Phase 6,
 *   unchanged, via getTopicState()).
 * - "revision due": isRevisionDue() (adaptiveDecisionRepository.mjs, Phase
 *   11, unchanged) plus effective (time-decayed) retention
 *   (retentionEngine.mjs, Phase 24, unchanged) — a softer trigger than the
 *   hard schedule for a topic that is visibly fading even before its next
 *   formal due date.
 *
 * This module only decides what those signals, taken together, add up to.
 */

import { MasteryGateStatus, CompletionVerdict } from './enums.mjs';
import { MASTERY_GATE_CONFIG } from './masteryGate.mjs';

export const COMPLETION_VERDICT_CONFIG = {
  prerequisiteRiskStrengthenFloor: 0.5, // a shaky-enough prerequisite outranks everything else — fix the foundation first
  revisionRetentionFloor: 0.5, // effective retention below this, even if nothing is formally due yet, reads as "needs review"
};

/**
 * @param {object} input
 * @param {string} input.masteryGateStatus one of MasteryGateStatus (evaluateMasteryGate()'s own output)
 * @param {number} input.mastery the blended mastery_score this topic currently reads at
 * @param {number} input.prerequisiteRisk 0..1 (learnerState.mjs)
 * @param {boolean} input.revisionDue the hard spaced-repetition trigger (adaptiveDecisionRepository.mjs)
 * @param {number} input.storedRetention retention_score as persisted (revision.mjs via recordAttempt) — 0 is its
 *   honest default for a topic that has never been through even one REVISION-mode cycle, not evidence of fading
 * @param {number|null} input.effectiveRetention time-decayed retention (retentionEngine.mjs), null if never studied
 * @param {number} input.attemptCount
 * @returns {{verdict: string, reason: string}}
 */
export function evaluateCompletionVerdict({
  masteryGateStatus,
  mastery,
  prerequisiteRisk,
  revisionDue,
  storedRetention,
  effectiveRetention,
  attemptCount,
}) {
  const cfg = COMPLETION_VERDICT_CONFIG;

  // Both of masteryGate's own confirmed-by-assessment outcomes are already
  // exactly the brief's vocabulary — pass them straight through.
  if (masteryGateStatus === MasteryGateStatus.RETAINED) {
    return { verdict: CompletionVerdict.RETAINED, reason: 'mastery and retention are both independently confirmed by assessment' };
  }
  if (masteryGateStatus === MasteryGateStatus.MASTERED) {
    return { verdict: CompletionVerdict.MASTERED, reason: 'mastery is confirmed by assessment; retention not yet proven to hold up over time' };
  }

  // A shaky prerequisite outranks everything else below it — more practice
  // on this topic, on top of a foundation that isn't there, is wasted effort.
  if (prerequisiteRisk >= cfg.prerequisiteRiskStrengthenFloor) {
    return {
      verdict: CompletionVerdict.STRENGTHEN,
      reason: `the weakest prerequisite is too shaky (risk ${prerequisiteRisk.toFixed(2)}) to keep building on top of it`,
    };
  }

  // Either the hard schedule says so, or she's visibly forgetting this
  // topic already even though nothing is formally due yet. storedRetention
  // > 0 gates the second trigger: a topic that has never been through even
  // one REVISION-mode cycle persists retention_score at its honest zero
  // default (recordAttempt(), unchanged) — that is "never measured," not
  // "faded," and must never be misread as something to revise.
  const retentionFading =
    storedRetention > 0 &&
    attemptCount > 0 &&
    effectiveRetention !== null &&
    effectiveRetention !== undefined &&
    effectiveRetention < cfg.revisionRetentionFloor;
  if (revisionDue || retentionFading) {
    return {
      verdict: CompletionVerdict.REVISE,
      reason: revisionDue
        ? 'the spaced-repetition schedule has this topic due for review right now'
        : `effective retention has decayed to ${effectiveRetention.toFixed(2)}, below the review floor`,
    };
  }

  // NEAR_MASTERY covers two different situations in masteryGate's own
  // cascade: "still building toward 0.8" and "at/above 0.8 but nothing
  // independent has confirmed it yet." Only the second genuinely calls for
  // REASSESS — reusing masteryGate's own nearMasteryFloor, not a new number.
  if (masteryGateStatus === MasteryGateStatus.NEAR_MASTERY && mastery >= MASTERY_GATE_CONFIG.nearMasteryFloor) {
    return {
      verdict: CompletionVerdict.REASSESS,
      reason: `mastery (${mastery.toFixed(2)}) looks ready, but nothing independent of practice has confirmed it yet`,
    };
  }

  return { verdict: CompletionVerdict.CONTINUE, reason: `status is ${masteryGateStatus} — keep going as planned` };
}
