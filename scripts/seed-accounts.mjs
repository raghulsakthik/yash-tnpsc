#!/usr/bin/env node
// Creates the three logins: a throwaway test account, Yashika's real
// account (linked to the learner row everything else already points at),
// and an admin account with no learner data of its own. Idempotent --
// re-running just resets passwords to the same values rather than erroring.

import pg from 'pg';
import { hashPassword } from '../src/lib/auth.mjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  process.exit(1);
}

const REAL_LEARNER_ID = process.env.APP_LEARNER_ID ?? '00000000-0000-0000-0000-000000000001';
const TEST_LEARNER_ID = '00000000-0000-0000-0000-000000000099';

const ACCOUNTS = [
  { email: 'test@yash.local', password: 'test1234', role: 'test', learnerId: TEST_LEARNER_ID },
  { email: 'yashikayash0515@gmail.com', password: 'yashika2026', role: 'learner', learnerId: REAL_LEARNER_ID },
  { email: 'admin@yash.local', password: 'admin1234', role: 'admin', learnerId: null },
];

const client = new pg.Client({ connectionString });
await client.connect();

try {
  // The test account gets its own isolated learner row, so trying things
  // never touches Yashika's real mastery/streak/history.
  await client.query(
    `INSERT INTO learner (id, name) VALUES ($1, 'Test Account')
     ON CONFLICT (id) DO NOTHING`,
    [TEST_LEARNER_ID]
  );
  await client.query(
    `INSERT INTO learner_profile (learner_id, language) VALUES ($1, 'en')
     ON CONFLICT (learner_id) DO NOTHING`,
    [TEST_LEARNER_ID]
  );

  for (const account of ACCOUNTS) {
    const passwordHash = hashPassword(account.password);
    await client.query(
      `INSERT INTO account (email, password_hash, role, learner_id) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, learner_id = EXCLUDED.learner_id`,
      [account.email, passwordHash, account.role, account.learnerId]
    );
    console.log(`${account.role.padEnd(8)} ${account.email}  password: ${account.password}`);
  }
} finally {
  await client.end();
}
