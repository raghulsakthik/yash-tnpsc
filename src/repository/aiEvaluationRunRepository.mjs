// Phase 30.7 — persisted evaluation runs (V17), the real history behind
// "AI v1 -> 72%, AI v2 -> 84%".
import { query } from '../lib/db.mjs';

export async function insertEvaluationRun(
  { capability, modelVersion, promptVersion, retrievalVersion, datasetVersion, algorithmVersion, totalItems, passRate, averageCorrectness, hallucinationRate },
  client = { query }
) {
  const result = await client.query(
    `INSERT INTO ai_evaluation_run
       (capability, model_version, prompt_version, retrieval_version, dataset_version, algorithm_version,
        total_items, pass_rate, average_correctness, hallucination_rate)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, run_at`,
    [capability, modelVersion, promptVersion, retrievalVersion, datasetVersion, algorithmVersion, totalItems, passRate, averageCorrectness, hallucinationRate]
  );
  return result.rows[0];
}

export async function findEvaluationRunHistory(capability, limit = 20, client = { query }) {
  const result = await client.query(
    `SELECT id, capability, model_version, prompt_version, retrieval_version, dataset_version, algorithm_version,
            total_items, pass_rate::float8 AS pass_rate, average_correctness::float8 AS average_correctness,
            hallucination_rate::float8 AS hallucination_rate, run_at
       FROM ai_evaluation_run WHERE capability = $1 ORDER BY run_at ASC LIMIT $2`,
    [capability, limit]
  );
  return result.rows;
}
