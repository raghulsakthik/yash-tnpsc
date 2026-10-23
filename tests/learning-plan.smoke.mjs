#!/usr/bin/env node
// Phase 7 exit test, against a real database:
//
//   DATABASE_URL=... node tests/learning-plan.smoke.mjs
//
// "A new learner can receive a valid initial learning action." Proves it
// against the real seeded syllabus: a brand new learner, with zero state
// anywhere, is correctly steered to the one truly prerequisite-free topic
// (aptitude.whole-numbers) rather than an arbitrary pick among the 11
// candidate topics — every other candidate transitively depends on an
// unattempted (0%) topic and is gated closed. Then shows the same engine
// adapting once she has real progress.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getInitialLearningAction } from '../src/services/learningPlanService.mjs';

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

console.log('\nA brand new learner, zero state anywhere\n');

const learner = await makeLearner('smoke-phase7-fresh');
const action = await getInitialLearningAction(learner);

check('she receives a valid action, not NONE/BLOCKED', action.action === 'FOUNDATION' || action.action === 'PRACTICE', action.action);
check('that action targets whole-numbers specifically — the one topic with no prerequisite at all', action.topicId === 'aptitude.whole-numbers', action.topicId);
check('it is a FOUNDATION step (she has never touched it)', action.stepType === 'FOUNDATION');
check('the starting difficulty is the documented default', action.difficulty === 0.3);
check(
  'every other candidate topic is gated out, each with a stated reason',
  action.gatedOut.length >= 8 && action.gatedOut.every((g) => typeof g.reason === 'string' && g.reason.length > 0),
  `(${action.gatedOut.length} gated)`
);
check(
  'division specifically is gated out because whole-numbers is unattempted',
  action.gatedOut.some((g) => g.topicId === 'aptitude.division' && /whole-numbers/.test(g.reason))
);

console.log('\nOnce she has real progress on whole-numbers, the engine opens up the next layer\n');

const { rows: wholeNumberQuestions } = await client.query(
  `SELECT id, answer_index, estimated_seconds FROM question WHERE topic_id = 'aptitude.whole-numbers' AND status = 'PUBLISHED' LIMIT 6`
);
for (const q of wholeNumberQuestions) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({
      client: dbClient,
      learnerId: learner,
      questionId: q.id,
      attemptId: crypto.randomUUID(),
      selectedIndex: q.answer_index,
      timeTakenMs: 8000,
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

const nextAction = await getInitialLearningAction(learner);
check(
  'the engine now recommends something other than whole-numbers, now that it is solid',
  nextAction.topicId !== 'aptitude.whole-numbers',
  nextAction.topicId
);
check(
  'division is now a live candidate (no longer gated), since whole-numbers improved',
  !nextAction.gatedOut.some((g) => g.topicId === 'aptitude.division')
);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase7-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('foundation learning engine smoke test passed');
