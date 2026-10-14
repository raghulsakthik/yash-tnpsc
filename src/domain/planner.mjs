/**
 * The daily plan / "Next Best Action". One recommendation, not a dashboard:
 * given everything currently known about her, what should she do right now.
 * Reuses selectTopic from selection.mjs rather than re-scoring topics here.
 */

const MINUTES_PER_REVISION_ITEM = 1.5;
const MINUTES_PER_PRACTICE_QUESTION = 1.5;
const PRACTICE_SESSION_LENGTH = 10;

/**
 * @param {object} input
 * @param {Array<object>} input.topics candidates for selectTopic: {id, name, accuracy, examWeight, prerequisiteGap, attemptCount}
 * @param {number} input.revisionDueCount
 * @param {object|null} input.selectedTopic the result of selectTopic(topics), passed in so planner.mjs stays free of selection logic
 * @returns {{primaryAction: string, topicId: string|null, reason: string, estimatedMinutes: number, revisionDue: number, items: Array<object>}}
 */
export function buildDailyPlan({ topics, revisionDueCount, selectedTopic }) {
  const items = [];

  if (revisionDueCount > 0) {
    items.push({
      type: 'MEMORY_ECHO',
      estimatedMinutes: Math.round(revisionDueCount * MINUTES_PER_REVISION_ITEM),
      count: revisionDueCount,
    });
  }

  if (selectedTopic) {
    items.push({
      type: 'PRACTICE',
      topicId: selectedTopic.id,
      topicName: selectedTopic.name,
      estimatedMinutes: Math.round(PRACTICE_SESSION_LENGTH * MINUTES_PER_PRACTICE_QUESTION),
      count: PRACTICE_SESSION_LENGTH,
    });
  }

  // Revision first when anything is overdue — forgetting what she already
  // knows costs more than deferring a new topic by a day.
  const primary = revisionDueCount > 0 ? items[0] : items.find((i) => i.type === 'PRACTICE');

  if (!primary) {
    return {
      primaryAction: 'NONE',
      topicId: null,
      reason: 'nothing scheduled yet',
      estimatedMinutes: 0,
      revisionDue: revisionDueCount,
      items,
    };
  }

  const reason =
    primary.type === 'MEMORY_ECHO'
      ? `${revisionDueCount} topic${revisionDueCount === 1 ? '' : 's'} due for review`
      : selectedTopic?.attemptCount === 0
        ? `${selectedTopic.name} has not been started yet`
        : `${selectedTopic.name} is the highest-priority topic right now`;

  return {
    primaryAction: primary.type,
    topicId: primary.topicId ?? null,
    reason,
    estimatedMinutes: items.reduce((sum, i) => sum + i.estimatedMinutes, 0),
    revisionDue: revisionDueCount,
    items,
  };
}
