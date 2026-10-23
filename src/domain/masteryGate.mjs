/**
 * Phase 13 — the Mastery Gate.
 *
 * concept/accuracy/speed/retention/confidence/consistency are already
 * computed and persisted by recordAttempt() (Phases 1-2, unchanged) as
 * `mastery_score` and its six components on learner_topic_state. Nothing
 * here recomputes them. What's new is the readiness ladder on top of them,
 * and — the part that actually makes this a *gate*, not just a label —
 * "assessment performance": high practice mastery alone is never enough to
 * call a topic MASTERED. It has to be confirmed by a real, independent
 * assessment (Phase 3's Default Foundation Test, or any future assessment
 * type), the same "verify before you trust it" principle Phase 11's
 * MINI_ASSESSMENT/ADVANCE_TOPIC tie-break already committed to. Without
 * that confirmation, even a mastery score of 0.95 only ever reads
 * NEAR_MASTERY — close, not yet trusted.
 */

import { MasteryGateStatus } from './enums.mjs';

export const MASTERY_GATE_CONFIG = {
  minAttemptsForAnyProgress: 3, // fewer attempts than this and raw scores aren't trustworthy yet
  foundationRequiredConceptFloor: 0.3, // lifetime concept score below this means the basics aren't there
  developingMasteryFloor: 0.4,
  practicingMasteryFloor: 0.6,
  nearMasteryFloor: 0.8,
  retentionForRetainedFloor: 0.75, // mastered AND still holds up over time
};

// Classifications (TopicClassification, Phase 4) an assessment could have
// given this topic that contradict a high practice-mastery reading.
const CONTRADICTING_CLASSIFICATIONS = new Set(['WEAK', 'CRITICAL', 'PREREQUISITE_BLOCKED']);

const READY_STATUSES = new Set([MasteryGateStatus.MASTERED, MasteryGateStatus.RETAINED]);

function gate(status, reason) {
  return { status, ready: READY_STATUSES.has(status), reason };
}

/**
 * @param {object} input
 * @param {number} input.concept lifetime accuracy (conceptScore, mastery.mjs — unchanged)
 * @param {number} input.mastery the blended mastery_score (mastery.mjs — unchanged)
 * @param {number} input.retention retention_score (revision.mjs, via recordAttempt — unchanged)
 * @param {number} input.attemptCount
 * @param {{classification: string}|null} input.assessmentPerformance the most recent completed
 *   assessment's verdict for this topic (Phase 3/4's stored diagnostic), or null if she's never
 *   been independently assessed on it
 * @returns {{status: string, ready: boolean, reason: string}}
 */
export function evaluateMasteryGate({ concept, mastery, retention, attemptCount, assessmentPerformance }) {
  const cfg = MASTERY_GATE_CONFIG;

  if (attemptCount < cfg.minAttemptsForAnyProgress) {
    return gate(MasteryGateStatus.FOUNDATION_REQUIRED, `only ${attemptCount} attempt(s) so far — not enough evidence yet`);
  }
  if (concept < cfg.foundationRequiredConceptFloor) {
    return gate(
      MasteryGateStatus.FOUNDATION_REQUIRED,
      `lifetime concept score is only ${concept.toFixed(2)} — the basics aren't there yet`
    );
  }
  if (mastery < cfg.developingMasteryFloor) {
    return gate(MasteryGateStatus.DEVELOPING, `mastery is ${mastery.toFixed(2)} — early days`);
  }
  if (mastery < cfg.practicingMasteryFloor) {
    return gate(MasteryGateStatus.PRACTICING, `mastery is ${mastery.toFixed(2)} — getting there, needs more reps`);
  }
  if (mastery < cfg.nearMasteryFloor) {
    return gate(MasteryGateStatus.NEAR_MASTERY, `mastery is ${mastery.toFixed(2)} — close, not confirmed yet`);
  }

  // mastery >= nearMasteryFloor from here — high enough to ask the only
  // question left: has anything independent of ongoing practice confirmed
  // it?
  if (!assessmentPerformance) {
    return gate(
      MasteryGateStatus.NEAR_MASTERY,
      `mastery is ${mastery.toFixed(2)} but no assessment has confirmed it yet`
    );
  }
  if (CONTRADICTING_CLASSIFICATIONS.has(assessmentPerformance.classification)) {
    return gate(
      MasteryGateStatus.NEAR_MASTERY,
      `practice mastery is high but the last assessment read this topic as ${assessmentPerformance.classification} — not trusted yet`
    );
  }

  if (retention >= cfg.retentionForRetainedFloor) {
    return gate(
      MasteryGateStatus.RETAINED,
      `mastery (${mastery.toFixed(2)}) and retention (${retention.toFixed(2)}) both hold up, confirmed by assessment`
    );
  }
  return gate(
    MasteryGateStatus.MASTERED,
    `mastery (${mastery.toFixed(2)}) confirmed by assessment; retention not yet proven over time`
  );
}
