// Phase 2 — repository for the existing curriculum tables (subject, chapter,
// topic, topic_prerequisite). These tables already exist (V1) and are already
// fully populated by scripts/seed.mjs from content/syllabus — this layer adds
// a clean read/write surface for domain services, it does not change the
// tables or the seed pipeline.
import { query } from '../lib/db.mjs';

export async function createSubject({ id, name, sortOrder = 0 }, client = { query }) {
  const result = await client.query(
    `INSERT INTO subject (id, name, sort_order) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
     RETURNING id, name, sort_order`,
    [id, name, sortOrder]
  );
  return result.rows[0];
}

export async function findSubjectById(id, client = { query }) {
  const result = await client.query('SELECT id, name, sort_order FROM subject WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createChapter({ id, subjectId, name, sortOrder = 0, questionCount }, client = { query }) {
  const result = await client.query(
    `INSERT INTO chapter (id, subject_id, name, sort_order, question_count) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order,
       question_count = EXCLUDED.question_count
     RETURNING id, subject_id, name, sort_order, question_count`,
    [id, subjectId, name, sortOrder, questionCount]
  );
  return result.rows[0];
}

export async function createTopic({ id, chapterId, name, sortOrder = 0 }, client = { query }) {
  const result = await client.query(
    `INSERT INTO topic (id, chapter_id, name, sort_order) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET chapter_id = EXCLUDED.chapter_id, name = EXCLUDED.name,
       sort_order = EXCLUDED.sort_order
     RETURNING id, chapter_id, name, sort_order`,
    [id, chapterId, name, sortOrder]
  );
  return result.rows[0];
}

export async function findTopicById(id, client = { query }) {
  const result = await client.query('SELECT id, chapter_id, name, sort_order FROM topic WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createPrerequisite({ topicId, prerequisiteTopicId, strength }, client = { query }) {
  const result = await client.query(
    `INSERT INTO topic_prerequisite (topic_id, prerequisite_topic_id, strength) VALUES ($1, $2, $3)
     ON CONFLICT (topic_id, prerequisite_topic_id) DO UPDATE SET strength = EXCLUDED.strength
     RETURNING topic_id, prerequisite_topic_id, strength`,
    [topicId, prerequisiteTopicId, strength]
  );
  return result.rows[0];
}

export async function findPrerequisitesForTopic(topicId, client = { query }) {
  const result = await client.query(
    'SELECT topic_id, prerequisite_topic_id, strength FROM topic_prerequisite WHERE topic_id = $1',
    [topicId]
  );
  return result.rows;
}
