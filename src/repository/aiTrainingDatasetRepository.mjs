// Phase 29.2 — real data pulls for training-dataset assembly. Every query
// is scoped to published/real content, never draft or learner-specific
// private data.
import { query } from '../lib/db.mjs';

export async function findApprovedQuestionsSample(limit = 200, client = { query }) {
  const result = await client.query(`SELECT id, prompt, explanation, trap FROM question WHERE status = 'PUBLISHED' LIMIT $1`, [limit]);
  return result.rows;
}

export async function findPyqQuestionsSample(limit = 100, client = { query }) {
  const result = await client.query(
    `SELECT id, prompt, explanation, source FROM question WHERE source LIKE 'tnpsc-%' AND status = 'PUBLISHED' LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function findTopicsWithSampleExplanation(client = { query }) {
  const result = await client.query(
    `SELECT DISTINCT ON (t.id) t.id AS topic_id, t.name AS topic_name, q.explanation AS sample_explanation
       FROM topic t JOIN question q ON q.topic_id = t.id AND q.status = 'PUBLISHED'
      ORDER BY t.id, q.difficulty ASC`
  );
  return result.rows;
}

export async function findPrerequisiteEdgesWithNames(client = { query }) {
  const result = await client.query(
    `SELECT tp.topic_id, t1.name AS topic_name, tp.prerequisite_topic_id, t2.name AS prerequisite_topic_name, tp.strength::float8 AS strength
       FROM topic_prerequisite tp
       JOIN topic t1 ON t1.id = tp.topic_id
       JOIN topic t2 ON t2.id = tp.prerequisite_topic_id`
  );
  return result.rows;
}

// Phase 14's own evaluated interventions, across every real learner (this
// is a single-tenant system, but the query is written generically).
export async function findEvaluatedInterventions(client = { query }) {
  const result = await client.query(
    `SELECT topic_id, intervention_type, learning_gain::float8 AS learning_gain FROM intervention WHERE status = 'EVALUATED'`
  );
  return result.rows;
}
