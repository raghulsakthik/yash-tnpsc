// Phase 26.2 — PYQ Knowledge Mapping reads. Every query here is scoped to
// question.source LIKE 'tnpsc-%' (the real past-paper tag, unchanged since
// Phase 21) joined through topic -> chapter -> subject (unchanged since
// Phase 1) — no new schema needed for frequency/trend reporting, it is all
// already in the real seeded data.
import { query } from '../lib/db.mjs';

export async function findTopicFrequency(client = { query }) {
  const result = await client.query(
    `SELECT t.id AS "topicId", t.name AS "topicName", t.chapter_id AS "chapterId", COUNT(*)::int AS count
       FROM question q JOIN topic t ON t.id = q.topic_id
      WHERE q.source LIKE 'tnpsc-%' AND q.status = 'PUBLISHED'
      GROUP BY t.id, t.name, t.chapter_id`
  );
  return result.rows;
}

export async function findSubjectFrequency(client = { query }) {
  const result = await client.query(
    `SELECT s.id AS "subjectId", s.name AS "subjectName", COUNT(*)::int AS count
       FROM question q
       JOIN topic t ON t.id = q.topic_id
       JOIN chapter c ON c.id = t.chapter_id
       JOIN subject s ON s.id = c.subject_id
      WHERE q.source LIKE 'tnpsc-%' AND q.status = 'PUBLISHED'
      GROUP BY s.id, s.name`
  );
  return result.rows;
}

export async function findYearlyTrends(client = { query }) {
  const result = await client.query(
    `SELECT source_year AS year, COUNT(*)::int AS count
       FROM question
      WHERE source LIKE 'tnpsc-%' AND status = 'PUBLISHED' AND source_year IS NOT NULL
      GROUP BY source_year`
  );
  return result.rows;
}

export async function findDifficultyDistribution(client = { query }) {
  const result = await client.query(
    `SELECT CASE
              WHEN difficulty < 0.34 THEN 'EASY'
              WHEN difficulty < 0.67 THEN 'MEDIUM'
              ELSE 'HARD'
            END AS band,
            COUNT(*)::int AS count
       FROM question
      WHERE source LIKE 'tnpsc-%' AND status = 'PUBLISHED'
      GROUP BY 1`
  );
  return result.rows;
}

export async function findConceptFrequency(topicId, client = { query }) {
  const result = await client.query(
    `SELECT source_year AS year, COUNT(*)::int AS count
       FROM question
      WHERE topic_id = $1 AND source LIKE 'tnpsc-%' AND status = 'PUBLISHED' AND source_year IS NOT NULL
      GROUP BY source_year`,
    [topicId]
  );
  const { rows: totalRows } = await client.query(
    `SELECT COUNT(*)::int AS count FROM question WHERE topic_id = $1 AND source LIKE 'tnpsc-%' AND status = 'PUBLISHED'`,
    [topicId]
  );
  return { byYear: result.rows, count: totalRows[0]?.count ?? 0 };
}
