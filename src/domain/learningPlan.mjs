/**
 * Phase 7 — the Foundation Learning Engine.
 *
 * A brand new learner, with zero evidence anywhere, still needs one valid
 * initial action — not "Lesson 1, Lesson 2, Lesson 3, Lesson 4," but a real
 * decision: of the topics she could start with, which ones are actually
 * safe to start (PrerequisiteGate), which one is neediest among those
 * (LessonSelector, reusing selectTopic()), and at what difficulty
 * (DifficultySelector).
 *
 * Reuses weakestPrerequisite()/selectTopic() (selection.mjs) and
 * PREREQUISITE_BROKEN_THRESHOLD (diagnostic.mjs) unchanged. The one genuinely
 * new idea is the gate: /api/plan/today already scores a shaky prerequisite
 * as a *soft* penalty (TOPIC_WEIGHTS.prerequisiteUrgency), but it never
 * refuses to recommend a topic outright. A learner on day one, with every
 * dependent topic's only prerequisite sitting at an unattempted 0%, needs a
 * hard gate — "not yet," not just "slightly less than something else."
 */

import { selectTopic, weakestPrerequisite } from './selection.mjs';
import { PREREQUISITE_BROKEN_THRESHOLD } from './diagnostic.mjs';
import { PathStepType } from './learningPath.mjs';

// Matches learner_topic_state.current_difficulty's own DB default (V1) — a
// topic with no state yet starts exactly where the schema already says a
// fresh topic starts, not a value invented here.
export const DEFAULT_STARTING_DIFFICULTY = 0.3;

/**
 * PrerequisiteGate: is it safe to start (or keep going on) this topic right
 * now, given everything upstream of it?
 *
 * @param {string} topicId
 * @param {Map<string, Array<{id: string, strength: number}>>} prerequisiteGraph
 * @param {Map<string, number>} accuracyByTopic
 * @returns {{open: boolean, reason: string, weakestPrerequisite: {topicId: string, accuracy: number}|null}}
 */
export function gateTopic(topicId, prerequisiteGraph, accuracyByTopic) {
  const weakest = weakestPrerequisite(topicId, prerequisiteGraph, accuracyByTopic);
  if (!weakest) {
    return { open: true, reason: `${topicId} has no prerequisite standing in the way`, weakestPrerequisite: null };
  }

  const accuracyPercent = Math.round(weakest.accuracy * 10000) / 100;
  const weakestDto = { topicId: weakest.topicId, accuracy: accuracyPercent };
  const open = accuracyPercent >= PREREQUISITE_BROKEN_THRESHOLD;

  const reason = open
    ? `${topicId}'s weakest prerequisite, ${weakest.topicId}, is at ${accuracyPercent}% — solid enough to proceed`
    : `${topicId} is gated: its prerequisite ${weakest.topicId} is at ${accuracyPercent}%, below the ${PREREQUISITE_BROKEN_THRESHOLD}% floor`;

  return { open, reason, weakestPrerequisite: weakestDto };
}

/** @param {number|null|undefined} currentDifficulty */
export function selectStartingDifficulty(currentDifficulty) {
  return typeof currentDifficulty === 'number' ? currentDifficulty : DEFAULT_STARTING_DIFFICULTY;
}

/**
 * LessonSelector: among the topics the gate allows, pick the neediest one
 * (reusing selectTopic() unchanged — same weakness/examWeight/prerequisite-
 * urgency/momentum scoring the daily plan already uses) and decide whether
 * she needs the foundational step or can go straight to practice, based on
 * whether she's ever touched it at all.
 *
 * @param {Array<{id: string, name: string, accuracy: number, examWeight: number,
 *   prerequisiteGap: number, attemptCount: number, currentDifficulty: number,
 *   gate: {open: boolean, reason: string, weakestPrerequisite: object|null}}>} candidates
 * @returns {{topicId: string, topicName: string, stepType: string, difficulty: number,
 *   reason: string, gatedOut: Array<object>}|null}
 */
export function selectInitialAction(candidates) {
  const gatedOut = candidates.filter((c) => !c.gate.open).map((c) => ({ topicId: c.id, reason: c.gate.reason }));
  const open = candidates.filter((c) => c.gate.open);
  if (open.length === 0) return null;

  const selected = selectTopic(open);
  if (!selected) return null;

  const stepType = selected.attemptCount === 0 ? PathStepType.FOUNDATION : PathStepType.PRACTICE;
  const reason =
    stepType === PathStepType.FOUNDATION
      ? `${selected.name} has not been started yet — begin with its foundation`
      : `${selected.name} is already underway — keep practicing it`;

  return {
    topicId: selected.id,
    topicName: selected.name,
    stepType,
    difficulty: selectStartingDifficulty(selected.currentDifficulty),
    reason,
    gatedOut,
  };
}
