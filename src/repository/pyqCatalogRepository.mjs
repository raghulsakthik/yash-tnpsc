// Phase 26.3/26.7 — the real PYQ catalogue: question rows where
// source LIKE 'tnpsc-%' (unchanged tag since Phase 21), filterable by
// year/subject/topic/incorrect, backing year-wise/subject-wise/topic-wise/
// mixed/incorrect/timed practice modes. "Weak-area" itself is Phase 4's own
// live classification (learnerStateService.getLearnerSummary, unchanged) —
// the service layer passes the resulting topic ids in here, nothing new to
// compute for it.
import { query } from '../lib/db.mjs';

export async function findPyqQuestions({ year, subjectId, topicId, topicIds, incorrectOnlyLearnerId, limit }, client = { query }) {
  const conditions = [`q.source LIKE 'tnpsc-%'`, `q.status = 'PUBLISHED'`];
  const params = [];

  if (year) {
    params.push(year);
    conditions.push(`q.source_year = $${params.length}`);
  }
  if (subjectId) {
    params.push(subjectId);
    conditions.push(`s.id = $${params.length}`);
  }
  if (topicId) {
    params.push(topicId);
    conditions.push(`q.topic_id = $${params.length}`);
  }
  if (topicIds && topicIds.length > 0) {
    params.push(topicIds);
    conditions.push(`q.topic_id = ANY($${params.length})`);
  }
  if (incorrectOnlyLearnerId) {
    params.push(incorrectOnlyLearnerId);
    conditions.push(
      `EXISTS (SELECT 1 FROM question_attempt a WHERE a.question_id = q.id AND a.learner_id = $${params.length} AND a.correct = false)`
    );
  }

  params.push(limit ?? 50);
  const limitParam = `$${params.length}`;

  const result = await client.query(
    `SELECT q.id, q.topic_id AS "topicId", t.name AS "topicName", s.id AS "subjectId", s.name AS "subjectName",
            q.prompt, q.options, q.difficulty::float8 AS difficulty, q.estimated_seconds AS "estimatedSeconds",
            q.source, q.source_year AS year
       FROM question q
       JOIN topic t ON t.id = q.topic_id
       JOIN chapter c ON c.id = t.chapter_id
       JOIN subject s ON s.id = c.subject_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY q.source_year NULLS LAST, q.id
      LIMIT ${limitParam}`,
    params
  );
  return result.rows;
}

export async function findPyqQuestionById(id, client = { query }) {
  const result = await client.query(
    `SELECT q.id, q.topic_id AS "topicId", t.name AS "topicName", s.id AS "subjectId", s.name AS "subjectName",
            q.prompt, q.options, q.answer_index AS "answerIndex", q.explanation, q.trap,
            q.difficulty::float8 AS difficulty, q.estimated_seconds AS "estimatedSeconds",
            q.source, q.source_year AS year, q.paper, q.question_number AS "questionNumber",
            q.source_page AS "sourcePage", q.content_version AS "contentVersion"
       FROM question q
       JOIN topic t ON t.id = q.topic_id
       JOIN chapter c ON c.id = t.chapter_id
       JOIN subject s ON s.id = c.subject_id
      WHERE q.id = $1 AND q.source LIKE 'tnpsc-%'`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findPyqYears(client = { query }) {
  const result = await client.query(
    `SELECT source_year AS year, COUNT(*)::int AS count
       FROM question
      WHERE source LIKE 'tnpsc-%' AND status = 'PUBLISHED' AND source_year IS NOT NULL
      GROUP BY source_year
      ORDER BY source_year`
  );
  return result.rows;
}

export async function findPyqTopics(client = { query }) {
  const result = await client.query(
    `SELECT t.id AS "topicId", t.name AS "topicName", COUNT(*)::int AS count
       FROM question q JOIN topic t ON t.id = q.topic_id
      WHERE q.source LIKE 'tnpsc-%' AND q.status = 'PUBLISHED'
      GROUP BY t.id, t.name
      ORDER BY count DESC`
  );
  return result.rows;
}

// A real other question on the same topic, in a comparable difficulty
// band, for the solving assistant's "similar question" — never generated.
export async function findSimilarQuestion(topicId, difficulty, excludeId, client = { query }) {
  const result = await client.query(
    `SELECT id, prompt FROM question
      WHERE topic_id = $1 AND id != $2 AND status = 'PUBLISHED'
        AND difficulty BETWEEN $3 AND $4
      ORDER BY ABS(difficulty - $5)
      LIMIT 1`,
    [topicId, excludeId, Math.max(0, difficulty - 0.2), Math.min(1, difficulty + 0.2), difficulty]
  );
  return result.rows[0] ?? null;
}
