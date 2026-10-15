/**
 * The topic-card action label — {type, label} — shown on Learn/Revision
 * cards. Not new logic: `next_action` is already computed by
 * adaptDifficulty() (difficulty.mjs) and stored on learner_topic_state by
 * every attempt; this only attaches a display label to it, the same kind
 * of enum->label mapping MISTAKE_LABEL already does on the frontend for
 * mistake_type. Revision-due overrides everything else, mirroring
 * buildDailyPlan()'s own "revision first" priority (planner.mjs).
 *
 * Deliberately distinct from the attempt pipeline's own `nextAction`
 * (src/lib/attempts.mjs) — that one says what difficulty the *next
 * question* should be; this one says what button a topic card should show.
 */

const LABEL_BY_NEXT_ACTION = {
  PRACTICE: 'Continue',
  EASIER_QUESTION: 'Try an easier one',
  HARDER_QUESTION: 'Step it up',
  REVIEW_PREREQUISITE: 'Review the basics first',
};

/**
 * @param {object} input
 * @param {boolean} input.revisionDue
 * @param {boolean} input.started attemptCount > 0
 * @param {string|null} [input.nextAction] learner_topic_state.next_action
 * @returns {{type: string, label: string}|null}
 */
export function recommendedAction({ revisionDue, started, nextAction }) {
  if (revisionDue) return { type: 'REVISION', label: 'Review' };
  if (!started) return { type: 'PRACTICE', label: 'Start' };
  return { type: 'PRACTICE', label: LABEL_BY_NEXT_ACTION[nextAction] ?? 'Continue' };
}
