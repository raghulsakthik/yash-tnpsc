/**
 * Phase 29.6 — AI Evaluation. Deterministic scoring, not a second AI call
 * judging the first one — correctness and relevance are measured against
 * real, authored content (the question's own real explanation/prompt),
 * curriculum alignment against the real syllabus tree, and hallucination
 * risk reuses the same authority-overreach check the response validator
 * already applies (29.5). "Learner improvement after AI intervention" is
 * deliberately not computed here — that is the Feedback Loop (29.7),
 * reusing Phase 14's real intervention-effectiveness machinery, not a
 * second copy of it.
 */

import { keywordOverlapScore } from './aiKnowledgeBase.mjs';
import { validateAiResponse } from './ai/responseValidator.mjs';

export const AI_EVALUATION_CONFIG = {
  minAcceptableRelevance: 0.1, // a response sharing almost no real terms with the real question is off-topic
  idealLengthRange: [10, 400], // characters — "explanation quality" proxy: too short explains nothing, too long isn't a hint
};

/**
 * @param {object} item {response, expectedExplanation, questionPrompt, topicId}
 * @param {Set<string>} realTopicIds the real, seeded syllabus topic ids
 */
export function evaluateAiResponse(item, realTopicIds) {
  const { response, expectedExplanation, questionPrompt, topicId } = item;
  const cfg = AI_EVALUATION_CONFIG;

  const validation = validateAiResponse(response);
  const correctness = expectedExplanation ? keywordOverlapScore(expectedExplanation, response) : null;
  const relevance = questionPrompt ? keywordOverlapScore(questionPrompt, response) : null;
  const curriculumAlignment = topicId ? realTopicIds.has(topicId) : null;
  const explanationQuality = response.length >= cfg.idealLengthRange[0] && response.length <= cfg.idealLengthRange[1] ? 1 : 0;
  const hallucinationRisk = validation.valid ? 0 : 1; // reuses the same real authority-overreach / malformed-output check

  return {
    correctness,
    relevance,
    curriculumAlignment,
    explanationQuality,
    hallucinationRisk,
    validationReasons: validation.reasons,
    pass: validation.valid && (relevance === null || relevance >= cfg.minAcceptableRelevance) && curriculumAlignment !== false,
  };
}

/**
 * @param {Array<object>} items real evaluation-dataset items with a real response attached
 * @param {Set<string>} realTopicIds
 */
export function evaluateAiResponseBatch(items, realTopicIds) {
  const results = items.map((item) => ({ ...item, evaluation: evaluateAiResponse(item, realTopicIds) }));
  const passed = results.filter((r) => r.evaluation.pass).length;
  const realCorrectness = results.map((r) => r.evaluation.correctness).filter((v) => v !== null);
  return {
    totalItems: results.length,
    passed,
    passRate: results.length > 0 ? Math.round((passed / results.length) * 1000) / 1000 : null,
    averageCorrectness: realCorrectness.length > 0 ? Math.round((realCorrectness.reduce((a, b) => a + b, 0) / realCorrectness.length) * 1000) / 1000 : null,
    hallucinationRate: Math.round((results.filter((r) => r.evaluation.hallucinationRisk === 1).length / Math.max(1, results.length)) * 1000) / 1000,
    results,
  };
}
