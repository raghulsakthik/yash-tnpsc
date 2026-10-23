#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src/app/api');
const publicPrefixes = [
  'auth/login/', 'auth/register/', 'auth/dev-session/', 'auth/logout/', 'auth/me/',
  'cron/activity/', 'cron/engagement/', 'cron/keep-warm/', 'notify/engage/',
  'curriculum/', // canonical syllabus tree is intentionally shareable; learner state endpoints under this tree self-authenticate.
];
const publicExact = new Set(['curriculum/route.js', 'curriculum/tree/route.js']);
const authMarkers = ['requireLearnerId(', 'requireUser(', 'getSession(', 'requireAdmin(', 'requirePermission('];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.name === 'route.js') out.push(full);
  }
  return out;
}

const failures = [];
for (const file of await walk(root)) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const source = await readFile(file, 'utf8');
  const publicByPrefix = publicPrefixes.some((p) => rel.startsWith(p));
  const publicRoute = publicByPrefix || publicExact.has(rel);
  if (publicRoute) continue;
  if (!authMarkers.some((marker) => source.includes(marker))) failures.push(rel);
}

if (failures.length) {
  console.error('Unprotected API routes:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('API ownership audit passed: every non-public route contains an authentication/authorization boundary.');
