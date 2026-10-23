/**
 * Phase 26.4 — AI PYQ Solving Assistant. This project already has a real,
 * if minimal, generative AI provider wrapper (src/lib/ai/provider.mjs —
 * plain fetch to Anthropic's Messages API, gated on ANTHROPIC_API_KEY,
 * used today only by POST /api/ai/hint's single mistake-triggered
 * explanation cache). That key is unset in this environment, so this
 * module is the deterministic path every caller actually exercises here —
 * the same graceful-degradation outcome generateHint() itself already
 * returns when unreachable (null), reached a different way: every stage
 * below is built entirely from a question's own real, authored fields
 * (explanation, trap, prerequisite topics), never invented text, and
 * nothing here writes to learner_topic_state or question.answer_index.
 * "Explain simply" / "give hint" / "explain strategy" / "solve step by
 * step" / "explain why wrong" are all real views over data that already
 * exists, progressively revealing more of it.
 */

/**
 * @param {object} question {prompt, options, answerIndex, explanation, trap, difficulty}
 * @param {Array<{topicId: string, topicName: string}>} prerequisites real, unchanged topic_prerequisite rows
 * @param {number} stage 1..4 — how much to reveal
 */
export function buildProgressiveHint(question, prerequisites, stage) {
  const clampedStage = Math.min(4, Math.max(1, Math.round(stage)));
  const stages = [
    {
      level: 1,
      kind: 'HINT',
      content:
        question.trap != null
          ? `Watch out for this: ${question.trap}`
          : 'Re-read the question carefully — check what unit or step it is actually asking for.',
    },
    {
      level: 2,
      kind: 'STRATEGY',
      content:
        prerequisites.length > 0
          ? `This builds on ${prerequisites.map((p) => p.topicName).join(', ')}. Work from there before trying the full question.`
          : 'Break the problem into its individual steps before picking an option.',
    },
    {
      level: 3,
      kind: 'GUIDED_SOLUTION',
      content: question.explanation,
    },
    {
      level: 4,
      kind: 'FULL_EXPLANATION',
      content: `${question.explanation} The correct option is "${question.options[question.answerIndex]}".`,
    },
  ];
  return { stage: clampedStage, levels: stages.slice(0, clampedStage) };
}

/**
 * @param {object} question {options, answerIndex, explanation, trap}
 * @param {number|null} selectedIndex what she actually chose, or null if she's just asking
 */
export function buildWhyExplanation(question, selectedIndex) {
  const correctOption = question.options[question.answerIndex];
  const result = {
    correctOption,
    whyCorrect: question.explanation,
    whyOthersWrong: question.options
      .map((text, i) => ({ option: text, index: i }))
      .filter((o) => o.index !== question.answerIndex)
      .map((o) => ({
        option: o.option,
        reason:
          selectedIndex != null && o.index === selectedIndex && question.trap
            ? question.trap
            : `Not the full answer to what was asked — "${correctOption}" is.`,
      })),
  };
  if (selectedIndex != null) {
    result.whySelectedWasWrong =
      selectedIndex === question.answerIndex
        ? null // she was actually right
        : question.trap ?? `"${question.options[selectedIndex]}" does not satisfy what the question asked.`;
  }
  return result;
}

/**
 * The full step-by-step solve + a real similar question, never a generated
 * one — "similar" means an actual other real question on the same topic in
 * a comparable difficulty band, found by the repository, not invented here.
 *
 * @param {object} question
 * @param {{id: string, prompt: string}|null} similarQuestion a real question the repository found, or null
 */
export function buildFullSolve(question, similarQuestion) {
  return {
    solution: question.explanation,
    correctOption: question.options[question.answerIndex],
    similarQuestion: similarQuestion ? { questionId: similarQuestion.id, prompt: similarQuestion.prompt } : null,
    similarQuestionNote: similarQuestion ? null : 'no other real question on this topic in a comparable difficulty band exists yet',
  };
}
