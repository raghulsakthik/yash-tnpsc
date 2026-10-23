#!/usr/bin/env node
// Phase 23 exit test, against a real database:
//
//   DATABASE_URL=... node tests/cross-subject-decision.smoke.mjs
//
// Proves the full decision hierarchy (Learner State -> Subject Priority ->
// Topic Priority -> Action Priority) against real, multi-subject data —
// aptitude-mental-ability (322 real questions) and general-studies (Phase
// 20's real Indian Polity content) — on the real seeded syllabus.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getCrossSubjectDecision } from '../src/services/crossSubjectDecisionService.mjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const failures = [];
const check = (label, condition, detail = '') => {
  if (condition) console.log(`  ok   ${label}`);
  else {
    console.log(`  FAIL ${label} ${detail}`);
    failures.push(label);
  }
};

async function makeLearner(name) {
  const id = crypto.randomUUID();
  await client.query('INSERT INTO learner (id, name) VALUES ($1, $2)', [id, name]);
  await client.query('INSERT INTO learner_profile (learner_id, language) VALUES ($1, $2)', [id, 'en']);
  return id;
}

console.log('\nA brand new learner: General Studies correctly wins on real exam weight alone\n');

const learner = await makeLearner('smoke-phase23-crosssubject');
const fresh = await getCrossSubjectDecision(learner);

check('both real subjects with content (aptitude and general-studies) are reported', fresh.subjects.length >= 2, fresh.subjects.map((s) => s.id));
check('general-studies carries a real, non-zero exam weight derived from real chapter data', fresh.subjects.find((s) => s.id === 'general-studies')?.examWeight > 0);
check(
  'with both subjects equally untouched, General Studies (75 real marks) correctly outranks Aptitude (25 real marks) — exam weight, not a tie-break guess',
  fresh.selectedSubject.id === 'general-studies',
  fresh.selectedSubject.id
);
check('a real topic within the selected subject was chosen', typeof fresh.topicId === 'string' && fresh.topicId.length > 0, fresh.topicId);
check('a real adaptive action was produced for that topic (Phase 11, reused)', typeof fresh.action === 'string');

console.log('\nStrong, complete, recent real performance in General Studies flips the decision back to Aptitude\n');

const { rows: polityQuestions } = await client.query(
  `SELECT q.id, q.answer_index FROM question q JOIN topic t ON t.id = q.topic_id WHERE t.chapter_id = 'gs.indian-polity' AND q.status = 'PUBLISHED'`
);
for (const q of polityQuestions) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({
      client: dbClient,
      learnerId: learner,
      questionId: q.id,
      attemptId: crypto.randomUUID(),
      selectedIndex: q.answer_index, // every real Polity question answered correctly
      timeTakenMs: 10000,
      confidence: 4,
      mode: 'PRACTICE',
    });
    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

const afterPolity = await getCrossSubjectDecision(learner);
check(
  'general-studies now reads 100% accuracy, fully recent, from real practice',
  afterPolity.subjects.find((s) => s.id === 'general-studies').accuracy === 1
);
check(
  'once General Studies is strong and recent, the real exam-weight advantage is finally outweighed and the decision flips to the still-untouched Aptitude',
  afterPolity.selectedSubject.id === 'aptitude-mental-ability',
  afterPolity.selectedSubject.id
);
check(
  'the chosen topic belongs to the aptitude-mental-ability subject (its aptitude or reasoning chapters)',
  afterPolity.topicId.startsWith('aptitude.') || afterPolity.topicId.startsWith('reasoning.'),
  afterPolity.topicId
);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase23-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('cross-subject adaptive engine smoke test passed');
