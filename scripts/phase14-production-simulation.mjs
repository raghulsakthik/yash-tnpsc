#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { query, pool } from '../src/lib/db.mjs';
import { checkRateLimit } from '../src/lib/rateLimit.mjs';
import { claimNextProcessingJob } from '../src/lib/contentProcessing.mjs';
import { isObjectStorageConfigured, sha256 } from '../src/lib/objectStorage.mjs';

const baseUrl = process.env.SIMULATION_BASE_URL || 'http://localhost:3001';
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error?.message || error}`);
    console.error(`FAIL ${name}: ${error?.message || error}`);
  }
}

await check('database connectivity', async () => {
  const { rows } = await query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
});

await check('schema readiness', async () => {
  const { rows } = await query(`
    SELECT to_regclass('public.api_rate_limit_bucket') AS rate_table,
           to_regclass('public.content_processing_job') AS jobs,
           to_regclass('public.content_lineage') AS lineage`);
  assert.ok(rows[0].rate_table && rows[0].jobs && rows[0].lineage);
});

await check('distributed rate limit enforces window', async () => {
  const key = `phase14:${crypto.randomUUID()}`;
  const first = await checkRateLimit({ key, limit: 2, windowSeconds: 60 });
  const second = await checkRateLimit({ key, limit: 2, windowSeconds: 60 });
  const third = await checkRateLimit({ key, limit: 2, windowSeconds: 60 });
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  await query('DELETE FROM api_rate_limit_bucket WHERE bucket_key = $1', [key]);
});

await check('object storage configuration contract', async () => {
  assert.equal(typeof isObjectStorageConfigured(), 'boolean');
  assert.equal(sha256(Buffer.from('nova-phase14')).length, 64);
});

await check('production configuration rejects incomplete secrets', async () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', "process.env.NODE_ENV='production'; for (const k of ['DATABASE_URL','APP_URL','CRON_SECRET','S3_BUCKET','S3_REGION','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY']) delete process.env[k]; import('./src/lib/env.mjs')"], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}${result.stdout}`, /Missing required environment variable|Production configuration incomplete/);
});

await check('rate limiter remains correct under concurrent callers', async () => {
  const key = `phase14-concurrent:${crypto.randomUUID()}`;
  const results = await Promise.all(Array.from({ length: 12 }, () => checkRateLimit({ key, limit: 5, windowSeconds: 60 })));
  assert.equal(results.filter((result) => result.allowed).length, 5);
  assert.equal(results.filter((result) => !result.allowed).length, 7);
  await query('DELETE FROM api_rate_limit_bucket WHERE bucket_key = $1', [key]);
});

await check('public health endpoint', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
});

await check('public readiness endpoint', async () => {
  const response = await fetch(`${baseUrl}/api/ready`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ready');
  assert.equal(body.database, 'ok');
  assert.ok(body.latestMigration);
});

await check('unauthenticated API is denied', async () => {
  const response = await fetch(`${baseUrl}/api/profile`);
  assert.equal(response.status, 401);
});

await check('admin API is denied to unauthenticated callers', async () => {
  const response = await fetch(`${baseUrl}/api/admin/content/process`, { method: 'POST' });
  assert.equal(response.status, 401);
});

await check('cron API is denied without secret', async () => {
  const response = await fetch(`${baseUrl}/api/cron/activity`);
  assert.equal(response.status, 401);
});

await check('test ownership boundary is denied', async () => {
  const response = await fetch(`${baseUrl}/api/tests/00000000-0000-0000-0000-000000000000`);
  assert.equal(response.status, 401);
});

await check('worker stale-job recovery claims an abandoned job', async () => {
  const { rows: batches } = await query(`INSERT INTO content_processing_batch (created_by, file_count, status) VALUES ((SELECT id FROM app_user ORDER BY created_at LIMIT 1), 1, 'PROCESSING') RETURNING id`);
  const batchId = batches[0].id;
  const { rows: jobs } = await query(`
    INSERT INTO content_processing_job (batch_id, file_name, status, stage, progress, created_by, updated_at, started_at)
    VALUES ($1, 'phase14-stale.pdf', 'PROCESSING', 'EXTRACTING', 10, (SELECT created_by FROM content_processing_batch WHERE id = $1), now() - interval '11 minutes', now() - interval '11 minutes')
    RETURNING id`, [batchId]);
  const claimed = await claimNextProcessingJob();
  assert.equal(claimed, jobs[0].id);
  await query('DELETE FROM content_processing_job WHERE id = $1', [jobs[0].id]);
  await query('DELETE FROM content_processing_batch WHERE id = $1', [batchId]);
});

await check('processing job stale-recovery query shape', async () => {
  const { rows } = await query(`
    SELECT COUNT(*)::int AS count
    FROM content_processing_job
    WHERE status IN ('QUEUED', 'PROCESSING')`);
  assert.ok(Number.isInteger(rows[0].count));
});

if (failures.length) {
  console.error(`\nPhase 14 simulation failed: ${failures.length} check(s)`);
  await pool.end();
  process.exitCode = 1;
} else {
  console.log('\nPhase 14 production simulation passed.');
  await pool.end();
}
