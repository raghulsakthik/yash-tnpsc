import assert from 'node:assert/strict';

// Contract-level hardening checks that require no database or secrets.
// Database-specific invariants are enforced by V26 migration and the existing E2E suite.

const required = [
  'db/migrations/V24__content_engine_versioning.sql',
  'db/migrations/V25__content_engine_audit.sql',
  'db/migrations/V26__content_engine_hardening.sql',
  'src/app/api/admin/content-engine/rollback/route.js',
  'src/app/api/admin/content-engine/versions/route.js',
  'src/app/api/admin/content-engine/audit/route.js',
];

const fs = await import('node:fs/promises');
for (const file of required) {
  const stat = await fs.stat(file);
  assert.ok(stat.isFile(), `missing required hardening artifact: ${file}`);
}

const migration = await fs.readFile('db/migrations/V26__content_engine_hardening.sql', 'utf8');
assert.match(migration, /one_published_lesson_per_topic/);
assert.match(migration, /status='PUBLISHED'/);

console.log('Content Engine Phase 30 hardening contract: PASS');
