#!/usr/bin/env node
// Applies db/migrations/V*.sql in order, once each, inside a transaction.
// Deliberately ~60 lines instead of a migration framework: one learner, one
// database, and a tool you can read in full beats one you have to trust.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'db',
  'migrations'
);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migration (
    version     TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const { rows } = await client.query('SELECT version FROM schema_migration');
const applied = new Set(rows.map((r) => r.version));

const files = (await readdir(MIGRATIONS_DIR))
  .filter((f) => f.endsWith('.sql'))
  .sort((a, b) => {
    const n = (f) => Number(f.match(/^V(\d+)__/)?.[1] ?? 0);
    return n(a) - n(b);
  });

let count = 0;
for (const file of files) {
  const version = file.replace(/\.sql$/, '');
  if (applied.has(version)) continue;

  const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migration (version) VALUES ($1)', [version]);
    await client.query('COMMIT');
    console.log(`applied ${version}`);
    count += 1;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`failed ${version}: ${err.message}`);
    await client.end();
    process.exit(1);
  }
}

console.log(count === 0 ? 'schema already up to date' : `${count} migration(s) applied`);
await client.end();
