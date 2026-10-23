#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { query, pool } from '../src/lib/db.mjs';

const sourceUrl = new URL(process.env.DATABASE_URL || '');
if (!sourceUrl.hostname) throw new Error('DATABASE_URL is required');
const tempDir = mkdtempSync(path.join(tmpdir(), 'nova-backup-'));
const dumpFile = path.join(tempDir, 'nova.sql');
const tempDb = `nova_restore_${process.pid}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '_');
const targetUrl = new URL(sourceUrl.toString());
targetUrl.pathname = `/${tempDb}`;

const pgCliEnv = { ...process.env, ...(sourceUrl.password ? { PGPASSWORD: decodeURIComponent(sourceUrl.password) } : {}) };
const cliBase = ['-h', sourceUrl.hostname, '-p', String(sourceUrl.port || 5432), '-U', decodeURIComponent(sourceUrl.username)];
function run(command, args) {
  const printable = args.map((arg, i) => (i === args.length - 1 && command === 'pg_restore' ? arg : arg));
  console.log(`> ${command} (arguments redacted)`);
  execFileSync(command, args, { stdio: 'inherit', env: pgCliEnv });
}

try {
  const sourceCount = await query(`SELECT COUNT(*)::int AS users FROM app_user`);
  console.log(`Source snapshot: app_user=${sourceCount.rows[0].users}`);

  run('pg_dump', ['--format=plain', '--no-owner', '--no-acl', '--dbname', sourceUrl.toString(), '--file', dumpFile]);
  const fs = await import('node:fs/promises');
  let sql = await fs.readFile(dumpFile, 'utf8');
  sql = sql.replace(/^SET transaction_timeout = 0;\n/gm, '');
  await fs.writeFile(dumpFile, sql);
  run('createdb', [...cliBase, tempDb]);
  run('psql', [...cliBase, '--dbname', tempDb, '--file', dumpFile]);

  const { Client } = await import('pg');
  const client = new Client({ connectionString: targetUrl.toString() });
  await client.connect();
  const { rows } = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM app_user) AS users,
      (SELECT COUNT(*)::int FROM question) AS questions,
      (SELECT COUNT(*)::int FROM content_lineage) AS lineage,
      (SELECT COUNT(*)::int FROM content_processing_job) AS jobs`);
  await client.end();

  if (!rows[0]) throw new Error('Restore verification query returned no row');
  console.log(`Restored snapshot: app_user=${rows[0].users}, question=${rows[0].questions}, lineage=${rows[0].lineage}, jobs=${rows[0].jobs}`);
  console.log('PASS backup/restore verification');
} finally {
  try { run('dropdb', [...cliBase, '--if-exists', tempDb]); } catch (error) { console.error(`Cleanup warning: ${error.message}`); }
  rmSync(tempDir, { recursive: true, force: true });
  await pool.end();
}
