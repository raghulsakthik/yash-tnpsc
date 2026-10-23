#!/usr/bin/env node
// Phase 6 exit test, against a real database:
//
//   DATABASE_URL=... node tests/learner-state.smoke.mjs
//
// Proves the Learner Digital Twin reads real evidence, not a stub: a
// learner who does well on a topic and then visibly tires reads back with a
// real fatigue signal; her learner-level summary classifies live from
// today's learner_topic_state (reusing Phase 4's classifier unchanged), not
// from a past assessment snapshot.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getTopicState, getLearnerSummary } from '../src/services/learnerStateService.mjs';
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

console.log('\nA topic with no state yet is a clean NotFoundError, not a crash\n');

const fresh = await makeLearner('smoke-phase6-fresh');
let notFoundRaised = false;
try {
  await getTopicState(fresh, 'aptitude.fractions');
} catch (err) {
  notFoundRaised = err instanceof NotFoundError;
}
check('an untouched topic raises NotFoundError', notFoundRaised);

console.log('\nAnswering real questions produces a real digital twin\n');

const learner = await makeLearner('smoke-phase6-twin');
const { rows: questions } = await client.query(
  `SELECT id, topic_id, answer_index, estimated_seconds FROM question
    WHERE topic_id = 'aptitude.percentage' AND status = 'PUBLISHED' LIMIT 10`
);
check('the seeded bank has enough percentage questions to run this scenario', questions.length >= 8, `(got ${questions.length})`);

// First five answered well and briskly; the last three deliberately slower
// and wrong — a visible tiring-out pattern for fatigueRisk to pick up.
const plan = [
  ...questions.slice(0, 5).map((q) => ({ q, correct: true, timeTakenMs: 10000 })),
  ...questions.slice(5, 8).map((q) => ({ q, correct: false, timeTakenMs: 45000 })),
];

for (const { q, correct, timeTakenMs } of plan) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({
      client: dbClient,
      learnerId: learner,
      questionId: q.id,
      attemptId: crypto.randomUUID(),
      selectedIndex: correct ? q.answer_index : (q.answer_index + 1) % 4,
      timeTakenMs,
      confidence: 3,
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

const state = await getTopicState(learner, 'aptitude.percentage');
check('the persisted dimensions round-trip (mastery is a real number, not a stub)', typeof state.mastery === 'number' && !Number.isNaN(state.mastery));
check('attemptCount matches what was actually recorded', state.attemptCount === plan.length);
check('fatigueRisk picks up the real tiring-out pattern at the end', state.fatigueRisk > 0.3, state.evidence.fatigueRisk);
check('learningVelocity reads negative — she got worse across this run, not better', state.learningVelocity < 0, state.evidence.learningVelocity);
check('every derived signal carries its evidence, not just a number', [
  state.evidence.learningVelocity,
  state.evidence.misconceptionRisk,
  state.evidence.fatigueRisk,
  state.evidence.prerequisiteRisk,
].every((e) => typeof e === 'string' && e.length > 0));

console.log('\nThe learner summary classifies live, reusing Phase 4 unchanged\n');

const summary = await getLearnerSummary(learner);
check('the learner summary counts the topic she just touched', summary.topicsTouched === 1);
check('percentage shows up in the live classification', summary.classifications.some((c) => c.topicId === 'aptitude.percentage'));
check('a live recommendation was produced for it', summary.recommendations.some((r) => r.topicId === 'aptitude.percentage'));
check('averageMastery is a real number', typeof summary.averageMastery === 'number' && !Number.isNaN(summary.averageMastery));

const freshSummary = await getLearnerSummary(fresh);
check('a learner who has touched nothing gets an empty, not broken, summary', freshSummary.topicsTouched === 0 && freshSummary.averageMastery === null);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase6-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('learner digital twin smoke test passed');
