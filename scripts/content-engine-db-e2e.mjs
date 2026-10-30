#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const client = new Client({ connectionString: databaseUrl });
await client.connect();

const requiredColumns = {
  content_engine_publication: ['publication_id', 'manifest_hash', 'item_count', 'status'],
  content_engine_lesson_staging: [
    'lesson_id', 'topic_id', 'title', 'source_ids', 'publication_id', 'status',
  ],
  content_review_batch: ['id', 'status', 'lesson_ids'],
};

try {
  for (const [table, columns] of Object.entries(requiredColumns)) {
    const { rows } = await client.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    );
    const actual = new Set(rows.map((row) => row.column_name));
    for (const column of columns) {
      assert.ok(actual.has(column), `${table}.${column} is missing`);
    }
  }

  const publicationId = `ci-e2e-${crypto.randomUUID()}`;
  const manifestHash = crypto
    .createHash('sha256')
    .update(`${publicationId}:fixture`)
    .digest('hex');
  const lessonId = `ci-e2e-lesson-${crypto.randomUUID()}`;

  await client.query('BEGIN');
  await client.query(
    `INSERT INTO content_engine_publication
      (publication_id, manifest_hash, item_count, status)
     VALUES ($1, $2, $3, 'IMPORTED_PENDING_REVIEW')`,
    [publicationId, manifestHash, 1],
  );

  const duplicate = await client.query(
    `SELECT publication_id
       FROM content_engine_publication
      WHERE publication_id = $1 OR manifest_hash = $2`,
    [publicationId, manifestHash],
  );
  assert.equal(duplicate.rowCount, 1, 'publication idempotency lookup failed');

  await client.query(
    `INSERT INTO content_engine_lesson_staging
      (lesson_id, topic_id, title, concept, definition, explanation,
       examples, revision_notes, source_ids, engine_version, publication_id, status)
     VALUES ($1, NULL, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, 'PENDING_REVIEW')`,
    [
      lessonId,
      'CI E2E Fixture',
      'Fixture concept',
      'Fixture definition',
      'Fixture explanation',
      JSON.stringify(['Fixture example']),
      JSON.stringify(['Fixture note']),
      JSON.stringify(['fixture-evidence-1']),
      'ci-e2e',
      publicationId,
    ],
  );

  const staged = await client.query(
    `SELECT lesson_id, publication_id, status
       FROM content_engine_lesson_staging
      WHERE lesson_id = $1`,
    [lessonId],
  );
  assert.deepEqual(staged.rows[0], {
    lesson_id: lessonId,
    publication_id: publicationId,
    status: 'PENDING_REVIEW',
  });

  await client.query('ROLLBACK');

  const afterRollback = await client.query(
    `SELECT 1 FROM content_engine_publication WHERE publication_id = $1`,
    [publicationId],
  );
  assert.equal(afterRollback.rowCount, 0, 'transaction rollback did not remove publication');

  console.log('content-engine isolated DB E2E: PASS');
} finally {
  await client.end();
}
