#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
const port = Number(process.env.CONTENT_ENGINE_REVIEW_E2E_PORT ?? 3108);
const baseUrl = `http://127.0.0.1:${port}`;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}
function manifestHash(publicationId, items) {
  const canonical = canonicalize({ publication_id: publicationId, items: items.map((x) => ({ kind: x.kind, content_id: x.content_id, topic_id: x.topic_id, payload: x.payload })) });
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
function tokenHash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

const db = new Client({ connectionString: databaseUrl });
await db.connect();
let server;
const created = { adminId: null, sessionHash: null, publications: [], batches: [], questionIds: [], lessonIds: [] };

try {
  const topicResult = await db.query(`SELECT t.id FROM topic t LEFT JOIN lesson l ON l.topic_id=t.id ORDER BY (l.topic_id IS NULL) DESC,t.id LIMIT 1`);
  assert.ok(topicResult.rows.length, 'a topic is required');
  const topicId = topicResult.rows[0].id;

  const adminId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('hex');
  created.adminId = adminId;
  created.sessionHash = tokenHash(token);
  await db.query(`INSERT INTO learner(id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [adminId, 'Content Review E2E Admin']);
  await db.query(`INSERT INTO app_user(id, role, status, admin_role) VALUES ($1,'ADMIN','ACTIVE','super_admin')`, [adminId]);
  await db.query(`INSERT INTO user_session(user_id, token_hash, expires_at) VALUES ($1,$2,now()+interval '1 hour')`, [adminId, created.sessionHash]);

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', String(port)], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'test' } });
  let output = '';
  server.stdout.on('data', (chunk) => { output += chunk.toString(); });
  server.stderr.on('data', (chunk) => { output += chunk.toString(); });
  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    try { const response = await fetch(`${baseUrl}/api/admin/content/review`); if (response.status !== 404) { ready = true; break; } } catch {}
    await sleep(1000);
  }
  if (!ready) throw new Error(`Next server did not become ready. Output: ${output}`);

  const cookie = `session_token=${token}`;
  async function importPublication(label, title = `Review ${label}`) {
    const lessonId = `ci-review-lesson-${label}-${crypto.randomUUID()}`;
    const questionId = `ci-review-mcq-${label}-${crypto.randomUUID()}`;
    const publicationId = `ci-review-${label}-${crypto.randomUUID()}`;
    const items = [
      { kind: 'lesson', content_id: lessonId, topic_id: topicId, payload: { title, concept: `Review concept ${label}`, definition: `Review definition ${label}`, explanation: `Review explanation ${label}`, examples: [`Example ${label}`], revisionNotes: [`Note ${label}`], sourceIds: ['review-evidence-1'], version: 1 } },
      { kind: 'mcq', content_id: questionId, topic_id: topicId, payload: { question: `Which option is correct for ${label}?`, options: ['A','B','C','D'], answerIndex: 0, explanation: 'A is correct.', difficulty: 'easy', sourceIds: ['review-evidence-1'] } },
    ];
    const response = await fetch(`${baseUrl}/api/admin/content-engine/import`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ publicationId, manifestHash: manifestHash(publicationId, items), items }) });
    const responseText = await response.text();
    assert.equal(response.status, 201, responseText);
    const body = JSON.parse(responseText);
    assert.equal(body.reviewBatchIds.length, 1);
    created.publications.push(publicationId); created.batches.push(body.reviewBatchIds[0]); created.questionIds.push(questionId); created.lessonIds.push(lessonId);
    const importedLineage = await db.query(`SELECT content_id,content_kind,status,publication_id,source_ids FROM content_engine_lineage WHERE publication_id=$1 ORDER BY content_kind`, [publicationId]);
    assert.equal(importedLineage.rows.length, 2);
    assert.deepEqual(importedLineage.rows.map((x) => x.status), ['IMPORTED', 'IMPORTED']);
    assert.ok(importedLineage.rows.every((x) => x.source_ids.includes('review-evidence-1')));
    assert.equal((await db.query(`SELECT status FROM question WHERE id=$1`, [questionId])).rows[0].status, 'DRAFT');
    assert.equal((await db.query(`SELECT status FROM content_engine_lesson_staging WHERE id=$1`, [lessonId])).rows[0].status, 'PENDING');
    return { publicationId, batchId: body.reviewBatchIds[0], questionId, lessonId };
  }

  const approve = await importPublication('approve', 'Version One');
  const approveResponse = await fetch(`${baseUrl}/api/admin/content/review/${approve.batchId}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ decision: 'approve' }) });
  assert.equal(approveResponse.status, 200, await approveResponse.text());
  assert.equal((await db.query(`SELECT status FROM question WHERE id=$1`, [approve.questionId])).rows[0].status, 'PUBLISHED');
  assert.equal((await db.query(`SELECT status FROM content_engine_lesson_staging WHERE id=$1`, [approve.lessonId])).rows[0].status, 'PUBLISHED');
  assert.equal((await db.query(`SELECT COUNT(*)::int AS count FROM lesson WHERE topic_id=$1`, [topicId])).rows[0].count, 1);
  assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`, [topicId])).rows[0].title, 'Version One');
  assert.equal((await db.query(`SELECT version_number FROM content_engine_lesson_version WHERE topic_id=$1 AND status='PUBLISHED'`, [topicId])).rows[0].version_number, 1);
  const approvedLineage = await db.query(`SELECT content_kind,status,platform_id,source_ids,published_at,version_number FROM content_engine_lineage WHERE publication_id=$1 ORDER BY content_kind`, [approve.publicationId]);
  assert.equal(approvedLineage.rows.length, 2);
  assert.ok(approvedLineage.rows.every((x) => x.status === 'PUBLISHED'));
  assert.ok(approvedLineage.rows.every((x) => x.platform_id));
  assert.equal(approvedLineage.rows.find((x) => x.content_kind === 'lesson').version_number, 1);
  assert.equal((await db.query(`SELECT status FROM content_engine_publication WHERE publication_id=$1`, [approve.publicationId])).rows[0].status, 'APPROVED');

  const learnerLessonResponse = await fetch(`${baseUrl}/api/lesson/${encodeURIComponent(topicId)}`, { headers: { cookie } });
  const learnerLessonText = await learnerLessonResponse.text();
  assert.equal(learnerLessonResponse.status, 200, learnerLessonText);
  const learnerLesson = JSON.parse(learnerLessonText);
  assert.equal(learnerLesson.topic, topicId);
  assert.equal(learnerLesson.title, 'Version One');

  const v2 = await importPublication('v2', 'Version Two');
  const v2Response = await fetch(`${baseUrl}/api/admin/content/review/${v2.batchId}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ decision: 'approve' }) });
  assert.equal(v2Response.status, 200, await v2Response.text());
  assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`, [topicId])).rows[0].title, 'Version Two');
  const versions = await db.query(`SELECT version_number,title,status FROM content_engine_lesson_version WHERE topic_id=$1 ORDER BY version_number`, [topicId]);
  assert.deepEqual(versions.rows.map((x) => [x.version_number,x.title,x.status]), [[1,'Version One','SUPERSEDED'],[2,'Version Two','PUBLISHED']]);

  const rollbackResponse = await fetch(`${baseUrl}/api/admin/content-engine/rollback`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ topicId, versionNumber: 1 }) });
  assert.equal(rollbackResponse.status, 200, await rollbackResponse.text());
  assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`, [topicId])).rows[0].title, 'Version One');
  const afterRollback = await db.query(`SELECT version_number,title,status FROM content_engine_lesson_version WHERE topic_id=$1 ORDER BY version_number`, [topicId]);
  assert.equal(afterRollback.rows.find((x) => x.version_number === 1).status, 'PUBLISHED');
  assert.equal(afterRollback.rows.find((x) => x.version_number === 2).status, 'SUPERSEDED');
  assert.equal((await db.query(`SELECT status FROM content_engine_lineage WHERE publication_id=$1 AND content_id=$2`, [approve.publicationId, approve.lessonId])).rows[0].status, 'PUBLISHED');
  assert.equal((await db.query(`SELECT status FROM content_engine_lineage WHERE publication_id=$1 AND content_id=$2`, [v2.publicationId, v2.lessonId])).rows[0].status, 'REJECTED');

  const reject = await importPublication('reject', 'Rejected Version');
  const rejectResponse = await fetch(`${baseUrl}/api/admin/content/review/${reject.batchId}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ decision: 'reject' }) });
  assert.equal(rejectResponse.status, 200, await rejectResponse.text());
  assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`, [topicId])).rows[0].title, 'Version One');
  assert.equal((await db.query(`SELECT status FROM question WHERE id=$1`, [reject.questionId])).rows[0].status, 'ARCHIVED');
  assert.equal((await db.query(`SELECT status FROM content_engine_lesson_staging WHERE id=$1`, [reject.lessonId])).rows[0].status, 'REJECTED');
  assert.equal((await db.query(`SELECT status FROM content_review_batch WHERE id=$1`, [reject.batchId])).rows[0].status, 'REJECTED');
  const rejectedLineage = await db.query(`SELECT status,platform_id FROM content_engine_lineage WHERE publication_id=$1 ORDER BY content_kind`, [reject.publicationId]);
  assert.equal(rejectedLineage.rows.length, 2);
  assert.ok(rejectedLineage.rows.every((x) => x.status === 'REJECTED'));
  assert.ok(rejectedLineage.rows.every((x) => x.platform_id === null));
  assert.equal((await db.query(`SELECT status FROM content_engine_publication WHERE publication_id=$1`, [reject.publicationId])).rows[0].status, 'REJECTED');

  const pending = await fetch(`${baseUrl}/api/admin/content/review`, { headers: { cookie } });
  assert.equal(pending.status, 200);
  const pendingBody = await pending.json();
  assert.equal(pendingBody.batches.some((batch) => batch.id === approve.batchId || batch.id === reject.batchId || batch.id === v2.batchId), false);
  console.log('content-engine admin review + lineage + version rollback E2E: PASS');
} finally {
  try {
    for (const id of created.batches) await db.query('DELETE FROM content_review_batch WHERE id=$1', [id]);
    for (const id of created.lessonIds) await db.query('DELETE FROM content_engine_lesson_staging WHERE id=$1', [id]);
    for (const id of created.questionIds) await db.query('DELETE FROM question WHERE id=$1', [id]);
    for (const id of created.publications) await db.query('DELETE FROM content_engine_publication WHERE publication_id=$1', [id]);
    if (created.sessionHash) await db.query('DELETE FROM user_session WHERE token_hash=$1', [created.sessionHash]);
    if (created.adminId) await db.query('DELETE FROM app_user WHERE id=$1', [created.adminId]);
  } finally {
    if (server) { server.kill('SIGTERM'); await sleep(500); }
    await db.end();
  }
}
