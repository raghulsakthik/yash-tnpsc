#!/usr/bin/env node
/** Database-backed upload -> queue -> explicit start -> status integration test.
 * Uses a disposable DB and intentionally no Gemini key: the expected terminal
 * state is a visible FAILED job, never a false successful classification.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const port = Number(process.env.CONTENT_UPLOAD_E2E_PORT ?? 3112);
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const db = new pg.Client({ connectionString: databaseUrl });
await db.connect();
let server;
let adminId;
let studentId;
let studentTokenHash;
let tokenHash;
let committedQuestionId;
let committedResourceId;
let reviewBatchIds = [];
let batchId;
let storageKey;
try {
  const topic = await db.query(`SELECT t.id FROM topic t WHERE NOT EXISTS (SELECT 1 FROM lesson l WHERE l.topic_id=t.id) AND NOT EXISTS (SELECT 1 FROM topic_resource r WHERE r.topic_id=t.id) ORDER BY t.id LIMIT 1`);
  assert.ok(topic.rows.length, 'seeded syllabus topic is required');
  adminId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('hex');
  tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db.query('INSERT INTO learner(id,name) VALUES($1,$2)', [adminId, 'Upload Pipeline E2E Admin']);
  await db.query("INSERT INTO app_user(id,role,status,admin_role) VALUES($1,'ADMIN','ACTIVE','super_admin')", [adminId]);
  await db.query("INSERT INTO user_session(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')", [adminId, tokenHash]);

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: databaseUrl, GEMINI_API_KEY: '', APP_URL: `http://127.0.0.1:${port}`, CRON_SECRET: 'integration-test-secret' },
  });
  let output = '';
  server.stdout.on('data', c => { output += c.toString(); });
  server.stderr.on('data', c => { output += c.toString(); });
  const base = `http://127.0.0.1:${port}`;
  const headers = { cookie: `session_token=${token}` };
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch(`${base}/api/admin/content/process`, { headers }); if (response.status !== 404) { ready = true; break; } } catch {}
    await sleep(500);
  }
  if (!ready) throw new Error(`Next server did not become ready: ${output}`);

  const uploadStartedAt = new Date();
  const payload = Buffer.from('TNPSC sample study notes. Fundamental rights are protected by the Constitution. This document is a safe integration fixture and must not be published without AI classification and human review.');
  const queuedResponse = await fetch(`${base}/api/admin/content/process`, {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ files: [{ fileName: 'integration-fixture.txt', mimeType: 'text/plain', fileBase64: payload.toString('base64') }] }),
  });
  const queuedText = await queuedResponse.text();
  assert.equal(queuedResponse.status, 202, queuedText);
  const queued = JSON.parse(queuedText);
  batchId = queued.batchId;
  assert.equal(queued.status, 'QUEUED');
  assert.equal(queued.fileCount, 1);
  const beforeStart = await db.query('SELECT status,stage,source_data,source_object_key FROM content_processing_job WHERE batch_id=$1', [batchId]);
  assert.equal(beforeStart.rows.length, 1);
  assert.equal(beforeStart.rows[0].status, 'QUEUED');
  assert.equal(beforeStart.rows[0].stage, 'QUEUED');
  storageKey = beforeStart.rows[0].source_object_key;
  assert.ok(storageKey, 'immutable upload object key must be persisted before processing');
  assert.deepEqual(await readFile(path.join(process.cwd(), 'storage/objects', storageKey)), payload, 'stored upload bytes must match the submitted file');

  const startedResponse = await fetch(`${base}/api/admin/content/process/${batchId}`, { method: 'POST', headers });
  const startedText = await startedResponse.text();
  assert.equal(startedResponse.status, 202, startedText);
  assert.equal(JSON.parse(startedText).status, 'PROCESSING');

  let state;
  for (let i = 0; i < 40; i++) {
    const response = await fetch(`${base}/api/admin/content/process/${batchId}`, { headers });
    assert.equal(response.status, 200);
    state = await response.json();
    if (['FAILED', 'COMPLETED'].includes(state.status)) break;
    await sleep(500);
  }
  assert.equal(state?.status, 'FAILED', `without a Gemini key the batch must fail visibly, got ${state?.status}; ${output}`);
  assert.equal(state.jobs.length, 1);
  assert.equal(state.jobs[0].status, 'FAILED');
  assert.equal(state.jobs[0].stage, 'FAILED');
  assert.match(state.jobs[0].error ?? '', /classification|Gemini|AI|unavailable|classif/i);
  const persisted = await db.query('SELECT source_data,source_object_key,status FROM content_processing_job WHERE batch_id=$1', [batchId]);
  assert.equal(persisted.rows[0].status, 'FAILED');
  assert.equal(persisted.rows[0].source_object_key, storageKey, 'failed job must retain object key for retry/recovery');
  assert.deepEqual(await readFile(path.join(process.cwd(), 'storage/objects', storageKey)), payload, 'failed processing must not delete the source object');
  const accidentalReview = await db.query('SELECT COUNT(*)::int n FROM content_review_batch WHERE created_at >= $1', [uploadStartedAt]);
  assert.equal(accidentalReview.rows[0].n, 0, 'failed classification must not create reviewable content');

  // Exercise the actual PDF commit gate and learner visibility boundary using
  // the same isolated DB and server. An unverified answer must be rejected.
  studentId = crypto.randomUUID();
  const studentToken = crypto.randomBytes(32).toString('hex');
  studentTokenHash = crypto.createHash('sha256').update(studentToken).digest('hex');
  await db.query('INSERT INTO learner(id,name) VALUES($1,$2)', [studentId, 'Upload Pipeline E2E Student']);
  await db.query("INSERT INTO app_user(id,role,status) VALUES($1,'STUDENT','ACTIVE')", [studentId]);
  await db.query("INSERT INTO user_session(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')", [studentId, studentTokenHash]);
  const questionText = `Integration fixture ${crypto.randomUUID()}: which statement is source-verified?`;
  const commitPayload = {
    sourceFileName: 'integration-fixture.txt',
    mcqs: [{ topicId: topic.rows[0].id, question: questionText, options: ['Verified statement', 'Distractor B', 'Distractor C', 'Distractor D'], answerIndex: 0, explanation: 'The uploaded fixture explicitly states that the first option is correct and provides the source evidence.', sourcePage: 1, humanVerified: true }],
    resources: [{ topicId: topic.rows[0].id, title: 'Integration fixture study note', body: 'This approved study note is intentionally substantive. It demonstrates how uploaded material is associated with a canonical topic, retained as draft content, and only shown to a learner after the authorised review workflow approves it.' }],
  };
  const unverifiedPayload = structuredClone(commitPayload);
  delete unverifiedPayload.mcqs[0].humanVerified;
  const blockedCommit = await fetch(`${base}/api/admin/content/commit`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(unverifiedPayload) });
  assert.equal(blockedCommit.status, 400, await blockedCommit.text());
  const commitResponse = await fetch(`${base}/api/admin/content/commit`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(commitPayload) });
  const commitText = await commitResponse.text();
  assert.equal(commitResponse.status, 200, commitText);
  const committed = JSON.parse(commitText);
  assert.equal(committed.insertedQuestions, 1);
  assert.equal(committed.resourcesAdded, 1);
  assert.equal(committed.reviewBatches, 2);
  const qRow = await db.query('SELECT id,status FROM question WHERE prompt=$1', [questionText]);
  assert.equal(qRow.rows.length, 1);
  committedQuestionId = qRow.rows[0].id;
  assert.equal(qRow.rows[0].status, 'DRAFT');
  const rRow = await db.query(`SELECT id,status FROM topic_resource WHERE topic_id=$1 AND title=$2 ORDER BY created_at DESC LIMIT 1`, [topic.rows[0].id, 'Integration fixture study note']);
  assert.equal(rRow.rows.length, 1);
  committedResourceId = rRow.rows[0].id;
  assert.equal(rRow.rows[0].status, 'DRAFT');
  const batches = await db.query(`SELECT id,question_ids,resource_ids FROM content_review_batch WHERE topic_id=$1 AND status='PENDING' AND created_at>now()-interval '2 minutes' ORDER BY created_at DESC`, [topic.rows[0].id]);
  for (const b of batches.rows) {
    if (b.question_ids.includes(committedQuestionId) || b.resource_ids.includes(committedResourceId)) reviewBatchIds.push(b.id);
  }
  assert.equal(reviewBatchIds.length, 2);
  const learnerHeaders = { cookie: `session_token=${studentToken}` };
  const hiddenBeforeReview = await fetch(`${base}/api/lesson/${encodeURIComponent(topic.rows[0].id)}`, { headers: learnerHeaders });
  assert.equal(hiddenBeforeReview.status, 404, 'draft notes must not be visible to learners');
  for (const reviewId of reviewBatchIds) {
    const approval = await fetch(`${base}/api/admin/content/review/${reviewId}`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'approve', humanVerified: true }) });
    assert.equal(approval.status, 200, await approval.text());
  }
  assert.equal((await db.query('SELECT status FROM question WHERE id=$1', [committedQuestionId])).rows[0].status, 'PUBLISHED');
  assert.equal((await db.query('SELECT status FROM topic_resource WHERE id=$1', [committedResourceId])).rows[0].status, 'PUBLISHED');
  const visibleAfterReview = await fetch(`${base}/api/lesson/${encodeURIComponent(topic.rows[0].id)}`, { headers: learnerHeaders });
  const visibleBody = await visibleAfterReview.json();
  assert.equal(visibleAfterReview.status, 200);
  assert.ok(visibleBody.resources.some(resource => resource.title === 'Integration fixture study note'));
  console.log('PDF commit answer-verification -> DRAFT review -> learner lesson visibility E2E: PASS');
  console.log('content upload queue -> explicit start -> persisted failure/status E2E: PASS');
  console.log(`batch=${batchId} job=${state.jobs[0].status} error=${state.jobs[0].error}`);
} finally {
  for (const id of reviewBatchIds) await db.query('DELETE FROM content_review_batch WHERE id=$1', [id]).catch(() => {});
  if (committedQuestionId) { await db.query('DELETE FROM content_lineage WHERE question_id=$1', [committedQuestionId]).catch(() => {}); await db.query('DELETE FROM question WHERE id=$1', [committedQuestionId]).catch(() => {}); }
  if (committedResourceId) { await db.query('DELETE FROM content_lineage WHERE resource_id=$1', [committedResourceId]).catch(() => {}); await db.query('DELETE FROM topic_resource WHERE id=$1', [committedResourceId]).catch(() => {}); }
  if (batchId) await db.query('DELETE FROM content_processing_batch WHERE id=$1', [batchId]).catch(() => {});
  if (storageKey) await rm(path.join(process.cwd(), 'storage/objects', storageKey), { force: true }).catch(() => {});
  if (tokenHash) await db.query('DELETE FROM user_session WHERE token_hash=$1', [tokenHash]).catch(() => {});
  if (studentTokenHash) await db.query('DELETE FROM user_session WHERE token_hash=$1', [studentTokenHash]).catch(() => {});
  if (studentId) { await db.query('DELETE FROM app_user WHERE id=$1', [studentId]).catch(() => {}); await db.query('DELETE FROM learner WHERE id=$1', [studentId]).catch(() => {}); }
  if (adminId) {
    await db.query('DELETE FROM app_user WHERE id=$1', [adminId]).catch(() => {});
    await db.query('DELETE FROM learner WHERE id=$1', [adminId]).catch(() => {});
  }
  if (server) { server.kill('SIGTERM'); await sleep(700); }
  await db.end();
}
