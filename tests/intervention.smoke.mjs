#!/usr/bin/env node
// Phase 14 exit test, against a real database:
//
//   DATABASE_URL=... node tests/intervention.smoke.mjs
//
// "Did this recommendation actually work?" proven end to end: start an
// intervention (a real baseline snapshot, tagged with whatever the
// Adaptive Decision Engine actually recommends), have the learner practice
// for real, then evaluate it and confirm the gain, the verdict, and the
// time spent are all computed from real evidence — not asserted.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { startIntervention, evaluateIntervention, listInterventions, getIntervention } from '../src/services/interventionService.mjs';
import { ValidationError } from '../src/services/errors.mjs';

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

console.log('\nStarting an intervention on an untouched topic\n');

const learner = await makeLearner('smoke-phase14-intervention');
const started = await startIntervention(learner, 'aptitude.whole-numbers');
check('a baseline of 0 was captured — nothing practiced yet', started.baselineScore === 0 && started.baselineRetention === 0);
check('it is tagged with a real Adaptive Decision Engine recommendation', typeof started.interventionType === 'string' && started.interventionType.length > 0);
check('the intervention starts ACTIVE', started.status === 'ACTIVE');

console.log('\nReal practice happens while the intervention is active\n');

const { rows: questions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.whole-numbers' AND status = 'PUBLISHED' LIMIT 8`
);
let totalTimeTakenMs = 0;
for (const q of questions) {
  const timeTakenMs = 8000;
  totalTimeTakenMs += timeTakenMs;
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({
      client: dbClient,
      learnerId: learner,
      questionId: q.id,
      attemptId: crypto.randomUUID(),
      selectedIndex: q.answer_index,
      timeTakenMs,
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

console.log('\nEvaluating: did it work?\n');

const evaluated = await evaluateIntervention(started.id);
check('the intervention is now EVALUATED', evaluated.status === 'EVALUATED');
check('postScore is a real, positive number — she improved from a 0 baseline', evaluated.postScore > 0);
check('learningGain equals postScore minus the 0 baseline', Math.abs(evaluated.learningGain - evaluated.postScore) < 0.001, `${evaluated.learningGain} vs ${evaluated.postScore}`);
check('the effectiveness verdict is IMPROVED — a real, measured gain from zero', evaluated.effectiveness.verdict === 'IMPROVED');
check(
  'timeSpentMs matches the real time actually recorded, not a guess',
  evaluated.timeSpentMs === totalTimeTakenMs,
  `${evaluated.timeSpentMs} vs ${totalTimeTakenMs}`
);

console.log('\nRe-evaluating an already-evaluated intervention is refused\n');

let refused = false;
try {
  await evaluateIntervention(started.id);
} catch (err) {
  refused = err instanceof ValidationError;
}
check('evaluating twice is refused, not silently re-run', refused);

console.log('\nThe experiment log lists it\n');

const list = await listInterventions(learner);
check('listInterventions includes this intervention', list.some((i) => i.id === started.id));

const reread = await getIntervention(started.id);
check('GET by id matches what evaluate returned', reread.learningGain === evaluated.learningGain);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM intervention WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase14-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('intervention tracking smoke test passed');
