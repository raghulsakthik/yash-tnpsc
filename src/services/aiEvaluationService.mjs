// Phase 29.6/30.7 — AiEvaluationService. Builds a real evaluation dataset
// from real, published questions (their own real, authored explanation is
// the "expected" output), runs each through the real AI Tutor pipeline
// (29.4/29.5 — whatever it actually returns, model or deterministic
// fallback), and scores every response deterministically
// (aiEvaluation.mjs). No second AI call judges the first one. Every run is
// persisted with the real version info active at the time (30.7) — the
// real history "AI v1 -> 72%, AI v2 -> 84%" is built from these rows, not
// a single overwritten number.
import { evaluateAiResponseBatch } from '../domain/aiEvaluation.mjs';
import { getVersionInfo } from '../domain/ai/versions.mjs';
import { getAiTutorResponse } from './aiTutorService.mjs';
import { findApprovedQuestionsSample } from '../repository/aiTrainingDatasetRepository.mjs';
import { findAllRealTopicIds } from '../repository/aiKnowledgeRepository.mjs';
import { insertEvaluationRun, findEvaluationRunHistory } from '../repository/aiEvaluationRunRepository.mjs';
import { AITaskType } from '../domain/enums.mjs';

const CAPABILITY = 'ai-tutor';

export async function runAiEvaluation(learnerId, { limit = 10 } = {}) {
  const [questions, realTopicIdList] = await Promise.all([findApprovedQuestionsSample(limit), findAllRealTopicIds()]);
  const realTopicIds = new Set(realTopicIdList);

  const items = [];
  for (const q of questions) {
    const result = await getAiTutorResponse(learnerId, AITaskType.EXPLAIN_SIMPLY, { questionId: q.id });
    items.push({ response: result.text, expectedExplanation: q.explanation, questionPrompt: q.prompt, topicId: result.topicId, source: result.source });
  }

  const batch = evaluateAiResponseBatch(items, realTopicIds);

  const version = getVersionInfo(CAPABILITY);
  const run = await insertEvaluationRun({
    capability: CAPABILITY,
    ...version,
    totalItems: batch.totalItems,
    passRate: batch.passRate,
    averageCorrectness: batch.averageCorrectness,
    hallucinationRate: batch.hallucinationRate,
  });

  return { ...batch, capability: CAPABILITY, version, runId: run.id, runAt: run.run_at };
}

export async function getEvaluationHistory(capability = CAPABILITY) {
  const runs = await findEvaluationRunHistory(capability);
  return {
    capability,
    runs: runs.map((r) => ({
      runId: r.id,
      modelVersion: r.model_version,
      promptVersion: r.prompt_version,
      retrievalVersion: r.retrieval_version,
      datasetVersion: r.dataset_version,
      algorithmVersion: r.algorithm_version,
      totalItems: r.total_items,
      passRate: r.pass_rate,
      averageCorrectness: r.average_correctness,
      hallucinationRate: r.hallucination_rate,
      runAt: r.run_at,
    })),
  };
}
