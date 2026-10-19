// Phase 2 — repository for the new generic `content`/`lesson` tables (V6).
import { query } from '../lib/db.mjs';

export async function createContent({ type, topicId, difficulty = null, status = 'DRAFT', metadata = {} }, client = { query }) {
  const result = await client.query(
    `INSERT INTO content (type, topic_id, difficulty, status, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, type, topic_id, difficulty, status, content_version, metadata, created_at, updated_at`,
    [type, topicId, difficulty, status, metadata]
  );
  return result.rows[0];
}

export async function findContentById(id, client = { query }) {
  const result = await client.query(
    `SELECT id, type, topic_id, difficulty, status, content_version, metadata, created_at, updated_at
     FROM content WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateContentStatus(id, status, client = { query }) {
  const result = await client.query(
    `UPDATE content SET status = $2, updated_at = now() WHERE id = $1
     RETURNING id, type, topic_id, difficulty, status, content_version, metadata, created_at, updated_at`,
    [id, status]
  );
  return result.rows[0] ?? null;
}

export async function findPublishedContentByTopic(topicId, type = null, client = { query }) {
  const result = type
    ? await client.query(
        `SELECT id, type, topic_id, difficulty, status, content_version, metadata, created_at, updated_at
         FROM content WHERE topic_id = $1 AND status = 'PUBLISHED' AND type = $2`,
        [topicId, type]
      )
    : await client.query(
        `SELECT id, type, topic_id, difficulty, status, content_version, metadata, created_at, updated_at
         FROM content WHERE topic_id = $1 AND status = 'PUBLISHED'`,
        [topicId]
      );
  return result.rows;
}

export async function createLesson({ contentId, title, body }, client = { query }) {
  const result = await client.query(
    'INSERT INTO content_lesson (content_id, title, body) VALUES ($1, $2, $3) RETURNING content_id, title, body',
    [contentId, title, body]
  );
  return result.rows[0];
}

export async function findLessonByContentId(contentId, client = { query }) {
  const result = await client.query('SELECT content_id, title, body FROM content_lesson WHERE content_id = $1', [contentId]);
  return result.rows[0] ?? null;
}
