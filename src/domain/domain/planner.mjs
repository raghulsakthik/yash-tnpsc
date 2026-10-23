/**
 * The daily plan / "Next Best Action". One recommendation, not a dashboard:
 * given everything currently known about her, what should she do right now.
 * Reuses selectTopic from selection.mjs rather than re-scoring topics here.
 */

const MINUTES_PER_REVISION_ITEM = 1.5;
const MINUTES_PER_PRACTICE_QUESTION = 1.5;
const ACTION_MINUTES = Object.freeze({
  REPEAT_LESSON: 20,
  PREREQUISITE_LESSON: 20,
  PRACTICE: 15,
  TIMED_PRACTICE: 15,
  REVISION: 10,
  MEMORY_ECHO: 10,
  ADVANCE_TOPIC: 20,
  MINI_ASSESSMENT: 10,
});
const PRACTICE_SESSION_LENGTH = 10;

/**
 * @param {object} input
 * @param {Array<object>} input.topics candidates for selectTopic: {id, name, accuracy, examWeight, prerequisiteGap, attemptCount}
 * @param {number} input.revisionDueCount
 * @param {object|null} input.selectedTopic the result of selectTopic(topics), passed in so planner.mjs stays free of selection logic
 * @returns {{primaryAction: string, topicId: string|null, reason: string, estimatedMinutes: number, revisionDue: number, items: Array<object>}}
 */
export function buildDailyPlan({ topics, revisionDueCount, selectedTopic, adaptiveDecision = null }) {
  const items = [];

  if (revisionDueCount > 0) {
    items.push({
      type: 'MEMORY_ECHO',
      estimatedMinutes: Math.round(revisionDueCount * MINUTES_PER_REVISION_ITEM),
      count: revisionDueCount,
    });
  }

  if (selectedTopic) {
    const action = adaptiveDecision?.action || 'PRACTICE';
    const targetTopic = action === 'PREREQUISITE_LESSON'
      ? adaptiveDecision?.context?.weakestPrerequisite?.topicId || selectedTopic.id
      : selectedTopic.id;
    const topicName = targetTopic === selectedTopic.id
      ? selectedTopic.name
      : `Prerequisite for ${selectedTopic.name}`;
    const estimatedMinutes = ACTION_MINUTES[action] ?? Math.round(PRACTICE_SESSION_LENGTH * MINUTES_PER_PRACTICE_QUESTION);

    items.push({
      type: action,
      topicId: targetTopic,
      topicName,
      estimatedMinutes,
      count: action === 'PRACTICE' || action === 'TIMED_PRACTICE' ? PRACTICE_SESSION_LENGTH : undefined,
      decisionScore: adaptiveDecision?.score ?? null,
      reason: adaptiveDecision?.reason || null,
    });
  }

  // Revision first when anything is overdue — forgetting what she already
  // knows costs more than deferring a new topic by a day.
  const primary = revisionDueCount > 0 ? items[0] : items.find((i) => i.type !== 'MEMORY_ECHO');

  if (!primary) {
    return {
      primaryAction: 'NONE',
      topicId: null,
      reason: 'nothing scheduled yet',
      estimatedMinutes: 0,
      revisionDue: revisionDueCount,
      items,
      adaptiveDecision: null,
    };
  }

  const reason = primary.type === 'MEMORY_ECHO'
    ? `${revisionDueCount} topic${revisionDueCount === 1 ? '' : 's'} due for review`
    : adaptiveDecision?.reason || (
        selectedTopic?.attemptCount === 0
          ? `${selectedTopic.name} has not been started yet`
          : `${selectedTopic.name} is the highest-priority topic right now`
      );

  return {
    primaryAction: primary.type,
    topicId: primary.topicId ?? null,
    reason,
    estimatedMinutes: items.reduce((sum, i) => sum + Number(i.estimatedMinutes || 0), 0),
    revisionDue: revisionDueCount,
    items,
    adaptiveDecision: adaptiveDecision || null,
  };
}
