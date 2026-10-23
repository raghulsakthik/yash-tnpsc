#!/usr/bin/env node
// Phase 21 exit test, against a real database:
//
//   DATABASE_URL=... node tests/pyq.smoke.mjs
//
// "PYQs must use the same attempt infrastructure — do not create an
// isolated PYQ scoring system." Proves it: a PYQ question served by the
// new endpoint is answered through the exact same, completely unchanged
// POST-/api/attempts pipeline (recordAttempt(), question_attempt,
// learner_topic_state) as any other question, and the performance summary
// reads that same evidence back, split by source.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getNextPyqQuestion, getPyqPerformanceSummary } from '../src/services/pyqService.mjs';
import { NotFoundError } from '../src/services/errors.mjs';

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

console.log('\nA topic with no real PYQ-tagged content fails cleanly, not with a wrong question\n');

const learner = await makeLearner('smoke-phase21-pyq');
let cleanNotFound = false;
try {
  await getNextPyqQuestion(learner, 'polity.fundamental-rights'); // real topic, but no PYQ-tagged content (Phase 20's content is all authored)
} catch (err) {
  cleanNotFound = err instanceof NotFoundError;
}
check('a topic with only authored content raises NotFoundError, not a wrong/authored question', cleanNotFound);

console.log('\nA real PYQ question is served and answered through the unchanged attempt pipeline\n');

const { rows: pyqTopics } = await client.query(
  `SELECT DISTINCT topic_id FROM question WHERE source LIKE 'tnpsc-%' AND status = 'PUBLISHED' LIMIT 1`
);
check('the seeded bank has at least one topic with real PYQ content', pyqTopics.length === 1);
const pyqTopicId = pyqTopics[0].topic_id;

const pyqQuestion = await getNextPyqQuestion(learner, pyqTopicId);
check('the served question is genuinely PYQ-tagged', pyqQuestion.source.startsWith('tnpsc-'), pyqQuestion.source);

const { rows: answerKeyRows } = await client.query('SELECT answer_index FROM question WHERE id = $1', [pyqQuestion.questionId]);
const answerIndex = answerKeyRows[0].answer_index;

const dbClient = await pool.connect();
let attemptResult;
try {
  await dbClient.query('BEGIN');
  attemptResult = await recordAttempt({
    client: dbClient,
    learnerId: learner,
    questionId: pyqQuestion.questionId,
    attemptId: crypto.randomUUID(),
    selectedIndex: answerIndex,
    timeTakenMs: 12000,
    confidence: 4,
    mode: 'PRACTICE', // the exact same mode/pipeline any ordinary practice attempt uses
  });
  await dbClient.query('COMMIT');
} catch (err) {
  await dbClient.query('ROLLBACK').catch(() => {});
  throw err;
} finally {
  dbClient.release();
}
check('the PYQ attempt was graded correct through the unchanged recordAttempt() pipeline', attemptResult.correct === true);

const { rows: attemptRows } = await client.query(
  `SELECT 1 FROM question_attempt WHERE learner_id = $1 AND question_id = $2`,
  [learner, pyqQuestion.questionId]
);
check('a real question_attempt row exists — the exact same table every other attempt uses', attemptRows.length === 1);

const { rows: stateRows } = await client.query(
  `SELECT attempt_count FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
  [learner, pyqTopicId]
);
check('learner_topic_state updated from the PYQ attempt exactly as from any practice attempt', stateRows[0].attempt_count === 1);

console.log('\nThe performance summary reads that same evidence back, split by source\n');

const summary = await getPyqPerformanceSummary(learner);
check('the PYQ bucket shows exactly the one real attempt just made', summary.overall.pyq.attemptCount === 1 && summary.overall.pyq.correctCount === 1);
check('the authored bucket is untouched — she has not answered any authored question', summary.overall.authored.attemptCount === 0);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase21-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('pyq engine smoke test passed');
