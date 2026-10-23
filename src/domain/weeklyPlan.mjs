/**
 * Phase 16 — the Weekly Plan Engine. A pure function over evidence the
 * service layer gathers from every earlier phase (Phase 3's eligibility,
 * Phase 4's live classification via Phase 6's summary, Phase 7's gated
 * initial action, the existing revision queue, and real PYQ-tagged
 * content) — nothing here re-derives any of that, it only decides what a
 * week built from that evidence looks like.
 *
 * Every day degrades honestly when its evidence is missing (no due
 * revision, no PYQ content for her current topics, no game engine at all
 * yet) rather than fabricating a target.
 */

export const DayType = Object.freeze({
  LESSON: 'LESSON',
  PRACTICE: 'PRACTICE',
  REVISION: 'REVISION',
  PYQ: 'PYQ',
  GAME: 'GAME',
  ASSESSMENT: 'ASSESSMENT',
  WEEKLY_TEST: 'WEEKLY_TEST',
});

/**
 * @param {object} evidence
 * @param {{topicId: string, topicName: string, reason: string}|null} evidence.lessonAction
 *   Phase 7's gated initial action, only when it's a FOUNDATION step
 * @param {{topicId: string, topicName: string|null, reason: string}|null} evidence.practiceTopic
 *   her current weakest live-classified topic (Phase 4/6), or Phase 7's action if nothing's classified yet
 * @param {number} evidence.revisionDueCount
 * @param {{topicId: string, topicName: string}|null} evidence.revisionTopic
 * @param {{topicId: string, topicName: string, pyqCount: number}|null} evidence.pyqTopic
 * @param {{topicId: string, topicName: string|null}|null} evidence.weakestTopicForGame
 * @param {{eligible: boolean, reason: string}} evidence.assessmentEligibility Phase 3's eligibility check
 * @param {boolean} evidence.hasCompletedDefaultAssessment
 * @returns {{days: Record<string, object>}}
 */
export function buildWeeklyPlan({
  lessonAction,
  practiceTopic,
  revisionDueCount,
  revisionTopic,
  pyqTopic,
  weakestTopicForGame,
  assessmentEligibility,
  hasCompletedDefaultAssessment,
}) {
  const days = {};

  days.MONDAY = lessonAction
    ? { type: DayType.LESSON, topicId: lessonAction.topicId, topicName: lessonAction.topicName, reason: lessonAction.reason }
    : { type: DayType.LESSON, topicId: null, topicName: null, reason: 'no foundation topic currently needs a lesson' };

  days.TUESDAY = practiceTopic
    ? { type: DayType.PRACTICE, topicId: practiceTopic.topicId, topicName: practiceTopic.topicName, reason: practiceTopic.reason }
    : { type: DayType.PRACTICE, topicId: null, topicName: null, reason: 'no priority topic identified yet' };

  days.WEDNESDAY =
    revisionDueCount > 0
      ? {
          type: DayType.REVISION,
          topicId: revisionTopic?.topicId ?? null,
          topicName: revisionTopic?.topicName ?? null,
          dueCount: revisionDueCount,
          reason: `${revisionDueCount} topic${revisionDueCount === 1 ? '' : 's'} due for review`,
        }
      : { type: DayType.REVISION, topicId: null, topicName: null, dueCount: 0, reason: 'nothing due for review this week' };

  days.THURSDAY = pyqTopic
    ? {
        type: DayType.PYQ,
        topicId: pyqTopic.topicId,
        topicName: pyqTopic.topicName,
        reason: `${pyqTopic.pyqCount} real past-paper question(s) available on ${pyqTopic.topicName}`,
      }
    : { type: DayType.PYQ, topicId: null, topicName: null, reason: 'no past-paper-tagged questions available for her current topics yet' };

  days.FRIDAY = {
    type: DayType.GAME,
    topicId: weakestTopicForGame?.topicId ?? null,
    topicName: weakestTopicForGame?.topicName ?? null,
    available: false,
    reason: 'no game engine exists yet — shown as a lighter practice placeholder on her weakest topic',
  };

  if (!hasCompletedDefaultAssessment) {
    days.SATURDAY = assessmentEligibility.eligible
      ? { type: DayType.ASSESSMENT, assessmentType: 'DEFAULT_TEST', reason: 'eligible for the Default Foundation Test and has not taken one yet' }
      : { type: DayType.ASSESSMENT, assessmentType: null, reason: `not yet eligible: ${assessmentEligibility.reason}` };
  } else {
    days.SATURDAY = {
      type: DayType.ASSESSMENT,
      assessmentType: 'MINI_ASSESSMENT',
      reason: 'already completed a Default Foundation Test — a lighter recheck is next, though the mini-assessment blueprint itself is not yet built',
    };
  }

  days.SUNDAY = { type: DayType.WEEKLY_TEST, reason: 'the existing weekly aptitude+reasoning test' };

  return { days };
}
