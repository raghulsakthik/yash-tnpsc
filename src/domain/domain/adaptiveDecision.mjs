/**
 * Phase 11 — the Adaptive Decision Engine.
 *
 * The brief's explicit instruction: never implement this as scattered
 * `if accuracy < 60 then lesson X` code. So this module scores every
 * candidate action from the same evidence in parallel — each scorer below
 * returns 0 when its action doesn't apply and a positive number when it
 * does, how strongly — and the highest score wins. Adding a ninth action
 * later means adding one more scorer, not threading a new branch through an
 * existing if/else chain.
 *
 * Reuses, never recomputes: TopicClassification (diagnostic.mjs, Phase 4)
 * for what's wrong, and the four digital-twin risk signals (learnerState.mjs,
 * Phase 6) for how it's wrong. This module only turns "what we already know"
 * into "what to do about it."
 */

import { TopicClassification, AdaptiveAction } from './enums.mjs';

// Every threshold the scoring below depends on, named and in one place —
// this *is* "configurable rules," not a constant buried in a conditional.
export const ADAPTIVE_DECISION_CONFIG = {
  speedIssueThreshold: 0.5, // speed score below this makes TIMED_PRACTICE worth considering
  softRevisionRetentionFloor: 0.6, // retention below this (but not yet formally due) nudges toward REVISION
  miniAssessmentAttemptInterval: 15, // every this many attempts on a topic, a recheck is worth it
  misconceptionRepeatLessonFloor: 0.4, // misconceptionRisk above this makes REPEAT_LESSON worth considering
  practiceBaselineScore: 0.4, // PRACTICE's score when nothing more specific applies — the safety net, not the first choice
};

/**
 * @typedef {object} AdaptiveDecisionContext
 * @property {string} topicId
 * @property {string} classification one of TopicClassification
 * @property {number} accuracy 0..1
 * @property {number} speed 0..1
 * @property {number} retention 0..1
 * @property {number} mastery 0..1
 * @property {number} misconceptionRisk 0..1
 * @property {number} prerequisiteRisk 0..1
 * @property {boolean} revisionDue
 * @property {number} attemptCount
 */

/**
 * Scores every candidate action against the same context. Each entry is
 * independent of the others — nothing here short-circuits, so every
 * candidate's score is always visible, not just the winner's.
 *
 * @param {AdaptiveDecisionContext} context
 * @returns {Array<{action: string, score: number}>}
 */
export function scoreCandidateActions(context) {
  const { classification, accuracy, speed, retention, mastery, misconceptionRisk, prerequisiteRisk, revisionDue, attemptCount } =
    context;
  const cfg = ADAPTIVE_DECISION_CONFIG;
  const blocked = classification === TopicClassification.PREREQUISITE_BLOCKED;

  return [
    {
      // The gate itself is the problem — fix the prerequisite, not this topic.
      action: AdaptiveAction.PREREQUISITE_LESSON,
      score: classification === TopicClassification.CRITICAL || blocked ? prerequisiteRisk : 0,
    },
    {
      // A real conceptual gap on *this* topic, not just low accuracy from
      // being new to it — a reteach, not more of the same questions.
      action: AdaptiveAction.REPEAT_LESSON,
      score:
        (classification === TopicClassification.WEAK || classification === TopicClassification.CRITICAL) &&
        misconceptionRisk >= cfg.misconceptionRepeatLessonFloor
          ? misconceptionRisk
          : 0,
    },
    {
      // The safe, always-available baseline — deliberately modest, so it
      // only wins when nothing more specific applies. Never recommended
      // while the prerequisite gate itself is closed.
      action: AdaptiveAction.PRACTICE,
      score: blocked ? 0 : cfg.practiceBaselineScore,
    },
    {
      // Accuracy holds up but pace doesn't — the topic-level counterpart to
      // adaptDifficulty()'s per-question "accurate but slow" case
      // (difficulty.mjs, unchanged): build fluency under time pressure.
      action: AdaptiveAction.TIMED_PRACTICE,
      score: !blocked && accuracy >= 0.6 && speed < cfg.speedIssueThreshold ? accuracy * (1 - speed) : 0,
    },
    {
      // The existing, scheduled spaced-repetition due date (revision.mjs,
      // unchanged) — a hard trigger, not a judgment call.
      action: AdaptiveAction.MEMORY_ECHO,
      score: revisionDue ? 1 : 0,
    },
    {
      // A softer nudge than MEMORY_ECHO: retention is visibly fading but
      // nothing is formally due yet. retention === 0 is excluded on
      // purpose — that's learner_topic_state's default for a topic that
      // has never been through even one revision cycle (recordAttempt only
      // ever updates retention_score on a REVISION-mode attempt), not
      // evidence of fading retention. A topic that HAS been through a
      // revision cycle can never land exactly on 0 (retentionValue's floor
      // is 0.15, smoothed), so this is a reliable, not a heuristic, check.
      action: AdaptiveAction.REVISION,
      score: !revisionDue && retention > 0 && retention < cfg.softRevisionRetentionFloor ? 1 - retention : 0,
    },
    {
      // Enough new practice volume has piled up since the pattern last
      // reset to be worth a quick recheck before committing to advance —
      // an approximation of "since the last assessment" by practice volume
      // rather than tracking assessment coverage per topic (see
      // docs/phase-11-completion.md's known limitations). Listed before
      // ADVANCE_TOPIC deliberately: both can score the same `mastery` value
      // at the interval checkpoint, and the stable sort below keeps the
      // earlier entry on an exact tie — verifying mastery should win a tie
      // against assuming it, not the other way round.
      action: AdaptiveAction.MINI_ASSESSMENT,
      score:
        !blocked && attemptCount > 0 && attemptCount % cfg.miniAssessmentAttemptInterval === 0 ? mastery : 0,
    },
    {
      // Solid, and nothing above is pulling her back to this topic.
      action: AdaptiveAction.ADVANCE_TOPIC,
      score: classification === TopicClassification.STRONG && !revisionDue ? mastery : 0,
    },
  ];
}

function explain(action, context) {
  switch (action) {
    case AdaptiveAction.PREREQUISITE_LESSON:
      return `${context.topicId}'s own prerequisite is the real problem (prerequisite risk ${context.prerequisiteRisk.toFixed(2)})`;
    case AdaptiveAction.REPEAT_LESSON:
      return `misconception risk is high (${context.misconceptionRisk.toFixed(2)}) — this calls for a reteach, not just more questions`;
    case AdaptiveAction.TIMED_PRACTICE:
      return `accuracy holds up (${context.accuracy.toFixed(2)}) but pace does not (speed ${context.speed.toFixed(2)})`;
    case AdaptiveAction.MEMORY_ECHO:
      return `a spaced-repetition revision is due today`;
    case AdaptiveAction.REVISION:
      return `retention is fading (${context.retention.toFixed(2)}) though nothing is formally due yet`;
    case AdaptiveAction.ADVANCE_TOPIC:
      return `mastery is strong (${context.mastery.toFixed(2)}) and nothing is pulling her back to this topic`;
    case AdaptiveAction.MINI_ASSESSMENT:
      return `${context.attemptCount} attempts in — worth a quick recheck before advancing further`;
    default:
      return 'no stronger signal applies yet; practice is the safe default';
  }
}

/**
 * The Adaptive Decision: scores every candidate, picks the highest, and
 * explains why — with every other candidate's score still attached, so the
 * decision is auditable, not just assertable.
 *
 * Ties are broken by scoreCandidateActions()'s own ordering (Array.sort is
 * stable): the one deliberate case this matters is MINI_ASSESSMENT vs.
 * ADVANCE_TOPIC, which can score identically (both driven by `mastery`) —
 * listed in that order on purpose, so verifying mastery beats assuming it.
 *
 * @param {AdaptiveDecisionContext} context
 * @returns {{action: string, score: number, reason: string, candidates: Array<{action: string, score: number}>}}
 */
export function decideAdaptiveAction(context) {
  const candidates = scoreCandidateActions(context);
  const ranked = [...candidates].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const action = winner.score > 0 ? winner.action : AdaptiveAction.PRACTICE;

  return {
    action,
    score: winner.score,
    reason: explain(action, context),
    candidates: ranked,
  };
}
