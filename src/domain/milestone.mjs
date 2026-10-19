/**
 * Phase 17 — Streak + Milestone Engine.
 *
 * "Use the existing event stream, don't update streaks from the frontend."
 * Every milestone below is judged from facts the service layer gathers
 * from real, already-recorded data — `learning_event` where a precise
 * discrete event exists (TEST_COMPLETED/DEFAULT_ASSESSMENT_COMPLETED), or
 * the authoritative `question_attempt`/assessment tables directly where
 * that's the more precise source (a milestone needs an exact timestamp,
 * and question_attempt is the one true record of what actually happened,
 * same status learning_event itself has always had as "analytics,"
 * confirmed since Phase 1's audit). Nothing here invents a new tracking
 * mechanism; see docs/phase-17-completion.md for exactly which table backs
 * which milestone, and the one (FIRST_LESSON) that can never unlock yet
 * because no lesson content or lesson event exists at all.
 */

import { MilestoneType } from './enums.mjs';

export const SEVEN_DAY_STREAK_THRESHOLD = 7;
export const HUNDRED_QUESTIONS_THRESHOLD = 100;

/**
 * StreakCalculator: the current consecutive-day streak of real activity,
 * with a one-day grace period (today not yet having any activity doesn't
 * break a streak that was solid through yesterday).
 *
 * @param {Array<string>} activityDates 'YYYY-MM-DD' strings, any order, deduped by the caller
 * @param {Date} [today] injectable for testing
 * @returns {number}
 */
export function computeCurrentStreak(activityDates, today = new Date()) {
  const dateSet = new Set(activityDates);
  const toDateString = (d) => d.toISOString().slice(0, 10);

  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!dateSet.has(toDateString(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1); // grace: no activity yet today doesn't break an existing streak
  }

  let streak = 0;
  while (dateSet.has(toDateString(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/**
 * MilestoneEvaluator: judges each milestone from already-gathered facts.
 * Returns one entry per known milestone type, always — including
 * FIRST_LESSON, always `unlocked: false` right now, with an honest reason
 * rather than being silently omitted.
 *
 * @param {object} facts
 * @param {Date|null} facts.firstTestEventAt
 * @param {boolean} facts.hasAnyMasteredTopic
 * @param {number} facts.totalQuestionAttempts
 * @param {Date|null} facts.hundredthAttemptAt
 * @param {number} facts.currentStreak
 * @param {{found: boolean, achievedAt: Date|null}} facts.topicRecovery
 * @param {Date|null} facts.firstPyqAttemptAt
 * @returns {Array<{type: string, unlocked: boolean, achievedAt: Date|null, reason?: string}>}
 */
export function evaluateMilestones({
  firstTestEventAt,
  hasAnyMasteredTopic,
  totalQuestionAttempts,
  hundredthAttemptAt,
  currentStreak,
  topicRecovery,
  firstPyqAttemptAt,
}) {
  return [
    {
      type: MilestoneType.FIRST_LESSON,
      unlocked: false,
      achievedAt: null,
      reason: 'no lesson content or lesson-activity event exists yet to ever unlock this',
    },
    { type: MilestoneType.FIRST_TEST, unlocked: firstTestEventAt != null, achievedAt: firstTestEventAt },
    {
      type: MilestoneType.FIRST_MASTERED_TOPIC,
      unlocked: hasAnyMasteredTopic,
      // No historical record of exactly when a topic first crossed the
      // gate (the gate is evaluated fresh each time, not logged) — true
      // right now, but the moment it first became true isn't known.
      achievedAt: null,
    },
    {
      type: MilestoneType.HUNDRED_QUESTIONS,
      unlocked: totalQuestionAttempts >= HUNDRED_QUESTIONS_THRESHOLD,
      achievedAt: hundredthAttemptAt,
    },
    {
      type: MilestoneType.SEVEN_DAY_STREAK,
      unlocked: currentStreak >= SEVEN_DAY_STREAK_THRESHOLD,
      // Same caveat as FIRST_MASTERED_TOPIC: detected now, not logged
      // historically, so this is "when we noticed," not "the 7th day."
      achievedAt: currentStreak >= SEVEN_DAY_STREAK_THRESHOLD ? new Date() : null,
    },
    {
      type: MilestoneType.TOPIC_RECOVERY,
      unlocked: topicRecovery.found,
      achievedAt: topicRecovery.achievedAt, // precise — the real assessment completion timestamp
    },
    { type: MilestoneType.FIRST_PYQ, unlocked: firstPyqAttemptAt != null, achievedAt: firstPyqAttemptAt },
  ];
}
