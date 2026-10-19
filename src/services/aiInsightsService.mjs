// Phase 30.4/30.5/30.6 — AiInsightsService. The three AI tasks scoped to a
// whole test or the whole learner, not one topic — ai_interaction has no
// real FK slot for either, so these bypass aiTutorService.mjs's
// topic-keyed cache entirely and call the same prompt/provider/validator
// pipeline directly. ANALYZE_TEST's result is the one thing the brief
// explicitly says to store — persisted into assessment.metadata, the
// exact same flexible JSONB slot Phase 27 already uses for the real
// blueprint and diagnostic, never a parallel storage mechanism.
import { AITaskType } from '../domain/enums.mjs';
import { buildPromptForTask } from '../domain/ai/promptTemplates.mjs';
import { validateAiResponse } from '../domain/ai/responseValidator.mjs';
import { buildDeterministicFallback } from '../domain/ai/deterministicFallback.mjs';
import { callAiModel } from './aiModelProviderService.mjs';
import { getAdaptiveTestAnalysis, getAdaptiveTest } from './adaptiveTestService.mjs';
import { explainTest } from './testExplanationService.mjs';
import { getExamReadiness } from './examReadinessService.mjs';
import { findAssessmentById } from '../repository/assessmentRepository.mjs';
import { pool } from '../lib/db.mjs';

async function runTask(task, context) {
  const prompt = buildPromptForTask(task, context);
  const modelResult = await callAiModel(prompt);

  if (modelResult && validateAiResponse(modelResult.text).valid) {
    return { source: 'model', text: modelResult.text, model: modelResult.model };
  }
  return { source: 'fallback', text: buildDeterministicFallback(task, context), model: 'deterministic-v1' };
}

export async function analyzeTest(testId) {
  const diagnostic = await getAdaptiveTestAnalysis(testId);
  const context = {
    overall: diagnostic.overall,
    strengths: diagnostic.report.strengths,
    weaknesses: diagnostic.report.weaknesses,
    cognitiveProblems: diagnostic.cognitiveProblems,
    retentionProblems: diagnostic.retentionProblems,
  };
  const result = await runTask(AITaskType.ANALYZE_TEST, context);

  // Stored exactly where Phase 27 already stores this test's real
  // blueprint and diagnostic — one JSONB payload, not a second table.
  await pool.query(
    `UPDATE assessment SET metadata = metadata || jsonb_build_object('aiAnalysis', $1::jsonb) WHERE id = $2`,
    [JSON.stringify({ explanation: result.text, source: result.source, model: result.model, generatedAt: new Date().toISOString() }), testId]
  );

  return { testId, keyStrengths: context.strengths, keyWeaknesses: context.weaknesses, explanation: result.text, source: result.source };
}

export async function getStoredTestAnalysis(testId) {
  const assessment = await findAssessmentById(testId);
  return assessment?.metadata?.aiAnalysis ?? null;
}

export async function explainTestConstruction(testId) {
  const explanation = await explainTest(testId);
  const context = { blueprintSummary: explanation.blueprint.summary, learnerTier: explanation.blueprint.learnerTier };
  const result = await runTask(AITaskType.EXPLAIN_TEST_CONSTRUCTION, context);
  return { testId, blueprint: explanation.blueprint, explanation: result.text, source: result.source };
}

export async function explainReadiness(learnerId) {
  const readiness = await getExamReadiness(learnerId);
  const context = {
    overall: readiness.overall,
    label: readiness.label,
    breakdown: readiness.breakdown,
    // The deterministic engine's own real explanation (Phase 28,
    // unchanged) IS the fallback here — AI only ever rephrases it, never
    // replaces the real score or invents a different driver.
    readinessExplanation: readiness.explanation.explanation,
  };
  const result = await runTask(AITaskType.EXPLAIN_READINESS, context);
  return { overall: readiness.overall, label: readiness.label, breakdown: readiness.breakdown, explanation: result.text, source: result.source };
}
