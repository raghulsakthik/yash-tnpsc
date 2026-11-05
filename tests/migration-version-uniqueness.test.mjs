import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

const migrationDir = new URL('../db/migrations/', import.meta.url);

test('database migration numeric versions are unique', async () => {
  const files = (await readdir(migrationDir)).filter((file) => /^V\d+__.*\.sql$/.test(file));
  const byVersion = new Map();
  for (const file of files) {
    const version = Number(file.match(/^V(\d+)__/)[1]);
    byVersion.set(version, [...(byVersion.get(version) ?? []), file]);
  }
  const duplicates = [...byVersion.entries()].filter(([, siblings]) => siblings.length > 1);
  assert.deepEqual(duplicates, [], `duplicate migration versions: ${duplicates.map(([version, siblings]) => `V${version}: ${siblings.join(', ')}`).join('; ')}`);
});
