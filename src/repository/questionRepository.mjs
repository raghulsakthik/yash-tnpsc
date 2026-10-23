// Phase 2 — repository for the existing `question` table. The table and its
// data are untouched (still 322 seeded rows, still read by selection.mjs via
// routes) — this just gives domain services a clean creation/read surface
// instead of ad hoc SQL, for *new* questions created through backend
// services going forward (e.g. authored outside the YAML content pipeline).
import { query } from '../lib/db.mjs';
import crypto from 'node:crypto';

function normalizedHash(language, prompt) {
  const normalized = prompt.trim().toLowerCase().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(`${language}:${normalized}`).digest('hex');
}

export async function createQuestion(
  {
    id,
    topicId,
    language = 'en',
    prompt,
    options,
    answerIndex,
    explanation,
    trap = null,
    difficulty,
    estimatedSeconds = 60,
    source = 'authored',
    sourceYear = null,
    status = 'PUBLISHED',
    contentId = null,
  },
  client = { query }
) {
  const result = await client.query(
    `INSERT INTO question
       (id, topic_id, language, prompt, options, answer_index, explanation, trap,
        difficulty, estimated_seconds, source, source_year, status, normalized_hash, content_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING id, topic_id, language, prompt, options, answer_index, explanation, trap,
       difficulty, estimated_seconds, source, source_year, status, content_id`,
    [
      id,
      topicId,
      language,
      prompt,
      JSON.stringify(options),
      answerIndex,
      explanation,
      trap,
      difficulty,
      estimatedSeconds,
      source,
      sourceYear,
      status,
      normalizedHash(language, prompt),
      contentId,
    ]
  );
  return result.rows[0];
}

export async function findQuestionById(id, client = { query }) {
  const result = await client.query(
    `SELECT id, topic_id, language, prompt, options, answer_index, explanation, trap,
       difficulty, estimated_seconds, source, source_year, status, content_id
     FROM question WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}
