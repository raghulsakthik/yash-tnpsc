// Phase 29.1 — the real, approved ("question.status = 'PUBLISHED'") content
// every AI Tutor response is grounded in: real questions/explanations/
// traps, real PYQs, real prerequisite relationships. No embeddings table —
// see aiKnowledgeBase.mjs's own module doc for why.
import { query } from '../lib/db.mjs';

export async function findApprovedQuestionsForTopic(topicId, limit = 5, client = { query }) {
  const result = await client.query(
    `SELECT id, prompt, explanation, trap, difficulty::float8 AS difficulty, source
       FROM question WHERE topic_id = $1 AND status = 'PUBLISHED'
      ORDER BY difficulty ASC LIMIT $2`,
    [topicId, limit]
  );
  return result.rows;
}

export async function findQuestionById(questionId, client = { query }) {
  const result = await client.query(
    `SELECT id, topic_id, prompt, options, answer_index, explanation, trap, difficulty::float8 AS difficulty, source
       FROM question WHERE id = $1 AND status = 'PUBLISHED'`,
    [questionId]
  );
  return result.rows[0] ?? null;
}

export async function findTopicById(topicId, client = { query }) {
  const result = await client.query(`SELECT id, name, chapter_id FROM topic WHERE id = $1`, [topicId]);
  return result.rows[0] ?? null;
}

export async function findPrerequisiteTopicsWithNames(topicId, client = { query }) {
  const result = await client.query(
    `SELECT tp.prerequisite_topic_id AS id, t.name, tp.strength::float8 AS strength
       FROM topic_prerequisite tp JOIN topic t ON t.id = tp.prerequisite_topic_id
      WHERE tp.topic_id = $1`,
    [topicId]
  );
  return result.rows;
}

// A real "semantic search" substitute's candidate pool — every real,
// published question's prompt+explanation, as plain searchable text.
export async function findAllApprovedQuestionTexts(limit = 500, client = { query }) {
  const result = await client.query(
    `SELECT q.id, q.topic_id, t.name AS topic_name, q.prompt || ' ' || q.explanation AS text
       FROM question q JOIN topic t ON t.id = q.topic_id
      WHERE q.status = 'PUBLISHED' LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function findAllRealTopicIds(client = { query }) {
  const result = await client.query(`SELECT id FROM topic`);
  return result.rows.map((r) => r.id);
}
