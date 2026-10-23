/**
 * Phase 29.5 — AIResponseValidator. Schema/safety validation applied to
 * every AI response before it ever reaches a learner — whether it came
 * from the real provider (src/lib/ai/provider.mjs, unchanged) or this
 * phase's deterministic fallback. Deliberately simple, deterministic
 * checks — no second AI call to judge the first one.
 */

export const AI_RESPONSE_VALIDATION_CONFIG = {
  minLength: 10,
  maxLength: 2000,
  // Phrases that would mean the model is answering as an authority on
  // something only the deterministic engine is allowed to decide — Phase
  // 30.8's explicit guardrail list: AI cannot change marks, correct
  // answers, mastery, declare a topic mastered, declare exam-readiness,
  // modify test results, change prerequisites, auto-publish generated
  // questions, or override a deterministic safety rule.
  forbiddenPhrases: [
    'your mastery is now',
    'you have mastered',
    'your score is',
    'marking this as complete',
    'i have updated your',
    'i have changed the correct answer',
    'the new correct answer is',
    'you are now exam-ready',
    'you are ready for the exam',
    'declaring this topic mastered',
    'i have updated your test result',
    'i have modified your test result',
    'i have changed the prerequisite',
    'i have published this question',
    'publishing this question automatically',
    'overriding the safety rule',
    'ignoring the deterministic rule',
  ],
};

/**
 * @param {string} text
 * @returns {{valid: boolean, reasons: Array<string>}}
 */
export function validateAiResponse(text) {
  const cfg = AI_RESPONSE_VALIDATION_CONFIG;
  const reasons = [];

  if (typeof text !== 'string' || text.trim().length === 0) {
    return { valid: false, reasons: ['empty response'] };
  }
  if (text.length < cfg.minLength) reasons.push(`too short (${text.length} chars, floor ${cfg.minLength})`);
  if (text.length > cfg.maxLength) reasons.push(`too long (${text.length} chars, ceiling ${cfg.maxLength})`);

  const lower = text.toLowerCase();
  for (const phrase of cfg.forbiddenPhrases) {
    if (lower.includes(phrase)) reasons.push(`claims authority over learner state: "${phrase}"`);
  }

  return { valid: reasons.length === 0, reasons };
}
