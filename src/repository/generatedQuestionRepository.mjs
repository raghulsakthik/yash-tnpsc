// Phase 26.5 — storage for the TNPSC-Inspired MCQ Engine's provenance/
// review framework (V13__pyq_intelligence.sql). No AI provider is
// configured in this environment, so nothing has ever been inserted here —
// insertGeneratedQuestion exists to complete the real contract a future AI
// integration would write through, not because anything calls it yet.
import { query } from '../lib/db.mjs';

export async function findPublishedGeneratedQuestions(client = { query }) {
  const result = await client.query(
    `SELECT gq.id, gq.topic_id AS "topicId", t.name AS "topicName", gq.prompt, gq.options,
            gq.difficulty::float8 AS difficulty, gq.source_pyq_ids AS "sourcePyqIds",
            gq.source_pattern AS "sourcePattern", gq.concept, gq.generation_model AS "generationModel",
            gq.generation_version AS "generationVersion", gq.validation_status AS "validationStatus",
            gq.review_status AS "reviewStatus", gq.created_at AS "createdAt"
       FROM generated_question gq JOIN topic t ON t.id = gq.topic_id
      WHERE gq.review_status = 'PUBLISHED'
      ORDER BY gq.created_at DESC`
  );
  return result.rows;
}

export async function insertGeneratedQuestion(row, client = { query }) {
  const result = await client.query(
    `INSERT INTO generated_question
       (id, topic_id, language, prompt, options, answer_index, explanation, difficulty,
        source_pyq_ids, source_pattern, concept, generation_model, generation_version, normalized_hash)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      row.id,
      row.topicId,
      row.language,
      row.prompt,
      JSON.stringify(row.options),
      row.answerIndex,
      row.explanation,
      row.difficulty,
      row.sourcePyqIds ?? [],
      row.sourcePattern ?? null,
      row.concept ?? null,
      row.generationModel,
      row.generationVersion,
      row.normalizedHash,
    ]
  );
  return result.rows[0];
}
