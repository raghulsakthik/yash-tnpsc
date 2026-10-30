#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
const port = Number(process.env.CONTENT_ENGINE_E2E_PORT ?? 3107);
const baseUrl = `http://127.0.0.1:${port}`;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}
function manifestHash(publicationId, items) {
  const canonical = canonicalize({
    publication_id: publicationId,
    items: items.map((x) => ({ kind: x.kind, content_id: x.content_id, topic_id: x.topic_id, payload: x.payload })),
  });
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const db = new Client({ connectionString: databaseUrl });
await db.connect();
let server;
try {
  const adminId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHashValue = tokenHash(token);
  const topicResult = await db.query('SELECT id FROM topic ORDER BY id LIMIT 1');
  assert.ok(topicResult.rows.length, 'seeded topic is required');
  const topicId = topicResult.rows[0].id;

  await db.query(
    `INSERT INTO learner(id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [adminId, 'Content E2E Admin'],
  );
  await db.query(
    `INSERT INTO app_user(id, role, status, admin_role)
     VALUES ($1, 'ADMIN', 'ACTIVE', 'super_admin')`,
    [adminId],
  );
  await db.query(
    `INSERT INTO user_session(user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '1 hour')`,
    [adminId, tokenHashValue],
  );

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' },
  });
  let output = '';
  server.stdout.on('data', (chunk) => { output += chunk.toString(); });
  server.stderr.on('data', (chunk) => { output += chunk.toString(); });

  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/admin/content-engine/import`, { method: 'GET' });
      if (response.status !== 404) { ready = true; break; }
    } catch {}
    await sleep(1000);
  }
  if (!ready) throw new Error(`Next server did not become ready. Output: ${output}`);

  const cookie = `session_token=${token}`;
  const post = async (items, suppliedHash = null) => {
    const publicationId = `ci-http-${crypto.randomUUID()}`;
    const hash = suppliedHash ?? manifestHash(publicationId, items);
    return fetch(`${baseUrl}/api/admin/content-engine/import`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ publicationId, manifestHash: hash, items }),
    });
  };

  const lesson = {
    kind: 'lesson',
    content_id: `ci-http-lesson-${crypto.randomUUID()}`,
    topic_id: topicId,
    payload: {
      title: 'HTTP E2E Fixture',
      concept: 'Fixture concept',
      definition: 'Fixture definition',
      explanation: 'Fixture explanation',
      examples: ['Fixture example'],
      revisionNotes: ['Fixture note'],
      sourceIds: ['fixture-evidence-1'],
      version: 1,
    },
  };
  const mcq = {
    kind: 'mcq',
    content_id: `ci-http-mcq-${crypto.randomUUID()}`,
    topic_id: topicId,
    payload: {
      question: 'Which option is the fixture answer?',
      options: ['A', 'B', 'C', 'D'],
      answerIndex: 0,
      explanation: 'The fixture answer is A.',
      difficulty: 'easy',
      sourceIds: ['fixture-evidence-1'],
    },
  };

  const valid = await post([lesson, mcq]);
  const validText = await valid.text();
  assert.equal(valid.status, 201, validText);
  const validBody = JSON.parse(validText);
  assert.equal(validBody.status, 'IMPORTED_PENDING_REVIEW');
  assert.equal(validBody.reviewBatchIds.length, 1);

  const publicationId = validBody.publicationId;
  const replay = await fetch(`${baseUrl}/api/admin/content-engine/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ publicationId, manifestHash: validBody.manifestHash, items: [lesson, mcq] }),
  });
  assert.equal(replay.status, 409, 'replay must be rejected');

  const badHash = await post([{
    ...mcq,
    content_id: `ci-http-bad-hash-${crypto.randomUUID()}`,
  }], '00'.repeat(32));
  assert.equal(badHash.status, 409, 'tampered manifest must be rejected');

  const pyq = {
    ...mcq,
    content_id: `ci-http-pyq-${crypto.randomUUID()}`,
    payload: { ...mcq.payload, isPyq: true, sourceIds: ['pyq-fixture'] },
  };
  const pyqResponse = await post([pyq]);
  assert.equal(pyqResponse.status, 400, 'PYQ content must be rejected at the platform boundary');
  const pyqBody = await pyqResponse.json();
  assert.equal(pyqBody.code, 'PYQ_CONTENT_BLOCKED');

  const missingProvenance = {
    ...mcq,
    content_id: `ci-http-no-provenance-${crypto.randomUUID()}`,
    payload: { ...mcq.payload, sourceIds: [] },
  };
  const provenanceResponse = await post([missingProvenance]);
  assert.equal(provenanceResponse.status, 400);
  const provenanceBody = await provenanceResponse.json();
  assert.equal(provenanceBody.code, 'INVALID_CONTENT');

  const unauthenticated = await fetch(`${baseUrl}/api/admin/content-engine/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ publicationId: `ci-http-unauth-${crypto.randomUUID()}`, manifestHash: 'x', items: [mcq] }),
  });
  assert.equal(unauthenticated.status, 401);

  const staged = await db.query(
    `SELECT status FROM content_engine_lesson_staging WHERE id = $1`,
    [lesson.content_id],
  );
  assert.equal(staged.rows[0]?.status, 'PENDING');

  await db.query('DELETE FROM content_engine_lesson_staging WHERE publication_id = $1', [publicationId]);
  await db.query('DELETE FROM question WHERE id = $1', [mcq.content_id]);
  await db.query('DELETE FROM content_review_batch WHERE id = ANY($1::uuid[])', [validBody.reviewBatchIds]);
  await db.query('DELETE FROM content_engine_publication WHERE publication_id = $1', [publicationId]);
  await db.query('DELETE FROM user_session WHERE token_hash = $1', [tokenHashValue]);
  await db.query('DELETE FROM app_user WHERE id = $1', [adminId]);

  console.log('content-engine authenticated HTTP E2E: PASS');
} finally {
  if (server) {
    server.kill('SIGTERM');
    await sleep(500);
  }
  await db.end();
}
