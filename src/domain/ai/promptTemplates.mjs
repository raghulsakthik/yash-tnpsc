/**
 * Phase 29.5 — AIPromptTemplate. One template per AITask, so no prompt
 * text is ever hardcoded at a call site (the brief's own explicit
 * instruction). Every template shares the same constraints
 * buildHintPrompt() (domain/ai/context.mjs, Phase 8, unchanged) already
 * set: short, constrained, cites only the real context it was given,
 * never invents a fact, and progressively helps rather than dumping the
 * answer — the brief's own "AI should progressively help" instruction.
 */

import { AITaskType } from '../enums.mjs';

const BASE_SYSTEM = [
  'You are a patient, encouraging tutor helping a student preparing for the',
  'TNPSC (Tamil Nadu Public Service Commission) exam.',
  'Use ONLY the facts given in the context below — never invent a fact,',
  'a date, a rule, or a number not present in it.',
  'Stay under 80 words. Progressively help rather than just stating the',
  'final answer outright.',
].join(' ');

const TASK_INSTRUCTIONS = {
  [AITaskType.EXPLAIN_SIMPLY]: 'Re-explain the already-shown explanation in the simplest possible terms, as if for a first-time learner.',
  [AITaskType.GIVE_HINT]: 'Give one short hint that nudges toward the method, without revealing the final answer.',
  [AITaskType.SHOW_EXAMPLE]: 'Using one of the real example questions given, show how the topic\'s method applies to it, step by step.',
  [AITaskType.TEACH_PREREQUISITE]: 'Briefly teach the named real prerequisite topic, explaining why it matters for the current topic.',
  [AITaskType.SOLVE_STEP_BY_STEP]: 'Walk through the real, given solution step by step, numbering each step.',
  [AITaskType.EXPLAIN_MISTAKE]: 'Explain, using the real mistake type given, what likely went wrong and how to avoid it next time.',
  [AITaskType.SIMILAR_QUESTION]: 'Briefly describe what makes the given real similar question a good next practice item for this topic.',
  [AITaskType.COMPARE_CONCEPTS]: 'Compare the two real named topics: what is similar, what is different, and when each applies.',
  [AITaskType.SUMMARIZE_TOPIC]: 'Summarize the real topic in 3-4 short bullet points, grounded only in the real example questions given.',
  [AITaskType.REVISION_NOTES]: 'Write 3-5 short, real, exam-focused revision bullet points for this topic, grounded only in the given context.',
  // Phase 30 — narration over already-computed, deterministic signals.
  // Never decide anything yourself; only explain what the numbers given
  // already mean.
  [AITaskType.INTERPRET_PATTERNS]: 'The given real signals (accuracy, speed, confidence pattern, retention, prerequisite risk) already identify a pattern deterministically — explain in plain language what it means for her, without inventing any number not given.',
  [AITaskType.EXPLAIN_RECOMMENDATION]: 'The given real, already-scored candidate actions were ranked deterministically — explain in plain language why the top one makes sense given the others, without changing the ranking or inventing a reason not in the given factors.',
  [AITaskType.ANALYZE_TEST]: 'Using only the given real test diagnostic (strengths, weaknesses, cognitive/retention problems), write a short, human-readable interpretation of how she did and what to prioritize next.',
  [AITaskType.EXPLAIN_TEST_CONSTRUCTION]: 'Using only the given real test blueprint and category shares, explain in plain language why the test was built this way.',
  [AITaskType.EXPLAIN_READINESS]: 'Using only the given real readiness score and component breakdown, explain in plain language what is driving it — never state or imply a different score than the one given.',
};

/**
 * @param {string} task one of AITaskType
 * @param {object} context whatever the AIContextBuilder assembled for this task
 * @returns {{system: string, user: string}}
 */
export function buildPromptForTask(task, context) {
  const instruction = TASK_INSTRUCTIONS[task];
  if (!instruction) throw new Error(`no prompt template registered for AI task ${task}`);

  return {
    system: `${BASE_SYSTEM} ${instruction}`,
    user: JSON.stringify(context, null, 2),
  };
}
