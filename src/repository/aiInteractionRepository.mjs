// Phase 29.5 — AIResponseLogger, backed by the widened ai_interaction
// table (V4, Phase 8; V9, question_id nullable + the real two-index cache
// scheme this reuses; V29, Phase 29). Caches one response per
// (topic_id, type, question_id) — question_id may be null for a
// topic-level task. The pre-existing POST /api/ai/hint route (Phase 8,
// unchanged) still writes directly; this is the generalized path every
// new AI Tutor task (29.4) goes through.
//
// Two real, pre-existing unique indexes (V4's ai_interaction_cache_idx on
// (question_id, type); V9's partial ai_interaction_topic_cache_idx on
// (topic_id, type) WHERE question_id IS NULL) back the two ON CONFLICT
// targets below — a single combined index was considered and rejected:
// it would mean dropping and replacing V9's own, already-working index
// rather than reusing it.
import { query } from '../lib/db.mjs';

export async function findCachedResponse({ topicId, type, questionId = null }, client = { query }) {
  const result = questionId
    ? await client.query(
        `SELECT response, model, created_at, intervention_id FROM ai_interaction WHERE question_id = $1 AND type = $2`,
        [questionId, type]
      )
    : await client.query(
        `SELECT response, model, created_at, intervention_id FROM ai_interaction WHERE topic_id = $1 AND type = $2 AND question_id IS NULL`,
        [topicId, type]
      );
  return result.rows[0] ?? null;
}

export async function insertAiInteraction(
  { learnerId, topicId, questionId = null, type, promptContext, response, model, interventionId = null },
  client = { query }
) {
  const conflictClause = questionId ? 'ON CONFLICT (question_id, type) DO NOTHING' : 'ON CONFLICT (topic_id, type) WHERE question_id IS NULL DO NOTHING';
  const result = await client.query(
    `INSERT INTO ai_interaction (learner_id, topic_id, question_id, type, prompt_context, response, model, intervention_id)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)
     ${conflictClause}
     RETURNING id, created_at`,
    [learnerId, topicId, questionId, type, JSON.stringify(promptContext), response, model, interventionId]
  );
  return result.rows[0] ?? null;
}

export async function findInteractionsForLearner(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT id, topic_id, question_id, type, model, intervention_id, created_at FROM ai_interaction
      WHERE learner_id = $1 ORDER BY created_at DESC`,
    [learnerId]
  );
  return result.rows;
}

// Phase 29.7 — which real interventions had at least one real AI
// interaction linked to them, for comparing AI-assisted vs unassisted
// learning gains.
export async function findInterventionIdsWithAiInteraction(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT DISTINCT intervention_id FROM ai_interaction WHERE learner_id = $1 AND intervention_id IS NOT NULL`,
    [learnerId]
  );
  return result.rows.map((r) => r.intervention_id);
}
