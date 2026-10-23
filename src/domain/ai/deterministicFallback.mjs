/**
 * Phase 29.4/29.5 — the deterministic fallback every AI Tutor task falls
 * back to when the real provider (src/lib/ai/provider.mjs) is unreachable
 * or unconfigured (the default state in this environment — no
 * ANTHROPIC_API_KEY, confirmed). Every line here is built from real,
 * already-fetched context (AIContextBuilder) — never invented text, the
 * same discipline Phase 26's pyqAssistant.mjs already established.
 */

import { AITaskType } from '../enums.mjs';

function listSamples(samples) {
  return samples.map((s) => `• ${s.prompt} — ${s.explanation}`).join('\n');
}

const FALLBACKS = {
  [AITaskType.EXPLAIN_SIMPLY]: (ctx) => `In simple terms: ${ctx.explanation}`,
  [AITaskType.GIVE_HINT]: (ctx) => (ctx.trap ? `Hint: watch out for this — ${ctx.trap}` : 'Hint: re-read the question and work it step by step.'),
  [AITaskType.SOLVE_STEP_BY_STEP]: (ctx) => `${ctx.explanation} The correct answer is "${ctx.correctAnswer}".`,
  [AITaskType.EXPLAIN_MISTAKE]: (ctx) =>
    ctx.isCorrect === false && ctx.trap ? `That answer is wrong because: ${ctx.trap}` : ctx.explanation,
  [AITaskType.SIMILAR_QUESTION]: (ctx) =>
    ctx.similarQuestion ? `A similar question on ${ctx.topicName}: "${ctx.similarQuestion.prompt}"` : `No other real question on ${ctx.topicName} at a comparable difficulty exists yet.`,
  [AITaskType.SHOW_EXAMPLE]: (ctx) =>
    ctx.sampleQuestions.length > 0 ? `Example on ${ctx.topicName}:\n${listSamples(ctx.sampleQuestions.slice(0, 1))}` : `No real example question for ${ctx.topicName} exists yet.`,
  [AITaskType.TEACH_PREREQUISITE]: (ctx) =>
    ctx.prerequisites.length > 0
      ? `${ctx.topicName} builds on: ${ctx.prerequisites.map((p) => p.topicName).join(', ')}.`
      : `${ctx.topicName} has no real prerequisite recorded — it is a foundation-level topic.`,
  [AITaskType.COMPARE_CONCEPTS]: (ctx) =>
    `${ctx.topicA.topicName} vs ${ctx.topicB.topicName}: both are real syllabus topics` +
    (ctx.topicA.prerequisites.some((p) => ctx.topicB.prerequisites.some((q) => q.topicId === p.topicId))
      ? ' that share a real common prerequisite.'
      : '; no shared real prerequisite is recorded between them.'),
  [AITaskType.SUMMARIZE_TOPIC]: (ctx) =>
    ctx.sampleQuestions.length > 0 ? `${ctx.topicName} summary, from real example questions:\n${listSamples(ctx.sampleQuestions)}` : `No real content exists yet to summarize ${ctx.topicName}.`,
  [AITaskType.REVISION_NOTES]: (ctx) =>
    ctx.sampleQuestions.length > 0
      ? `Revision notes for ${ctx.topicName}:\n${ctx.sampleQuestions.map((s) => `• ${s.explanation}`).join('\n')}`
      : `No real content exists yet to build revision notes for ${ctx.topicName}.`,
  [AITaskType.INTERPRET_PATTERNS]: (ctx) =>
    ctx.patterns.length > 0
      ? `On ${ctx.topicName}: ${ctx.patterns.join(' ')}`
      : `No real pattern (misconception, confidence mismatch, decay, or speed limitation) has been detected on ${ctx.topicName} yet.`,
  [AITaskType.EXPLAIN_RECOMMENDATION]: (ctx) =>
    ctx.topCandidate
      ? `${ctx.topCandidate.action} on ${ctx.topicName} is ranked highest (confidence ${ctx.topCandidate.confidence}) because: ${ctx.topCandidate.reason}`
      : 'No real candidate action is available to explain yet.',
  [AITaskType.ANALYZE_TEST]: (ctx) => {
    const strong = ctx.strengths.map((s) => s.topicName).join(', ') || 'none yet';
    const weak = ctx.weaknesses.map((w) => w.topicName).join(', ') || 'none yet';
    return `Real strengths: ${strong}. Real weaknesses: ${weak}. ${ctx.retentionProblems.length > 0 ? `Real knowledge decay detected on: ${ctx.retentionProblems.map((r) => r.topicName).join(', ')}.` : ''}`.trim();
  },
  [AITaskType.EXPLAIN_TEST_CONSTRUCTION]: (ctx) => `This test is ${ctx.blueprintSummary}.`,
  [AITaskType.EXPLAIN_READINESS]: (ctx) => ctx.readinessExplanation,
};

/**
 * @param {string} task one of AITaskType
 * @param {object} context the real, already-built context for this task
 * @returns {string}
 */
export function buildDeterministicFallback(task, context) {
  const fn = FALLBACKS[task];
  if (!fn) throw new Error(`no deterministic fallback registered for AI task ${task}`);
  return fn(context);
}
