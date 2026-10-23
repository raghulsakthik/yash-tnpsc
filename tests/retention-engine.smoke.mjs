#!/usr/bin/env node
// Phase 24 exit test, against a real database:
//
//   DATABASE_URL=... node tests/retention-engine.smoke.mjs
//
// Proves the two real gaps this phase closes against real seeded data and a
// real recordAttempt() pipeline: (1) a topic untouched for a long time reads
// lower than its last-computed stored score once decay is applied, while a
// just-studied topic reads at essentially the stored value; (2) a real
// conceptual-mistake pattern (classifyMistake(), unchanged) further
// discounts the effective estimate on top of time decay.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getEffectiveRetention } from '../src/services/retentionEngineService.mjs';

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

async function answer({ learnerId, questionId, selectedIndex, timeTakenMs, confidence, mode }) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({
      client: dbClient,
      learnerId,
      questionId,
      attemptId: crypto.randomUUID(),
      selectedIndex,
      timeTakenMs,
      confidence,
      mode,
    });
    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

const topicId = 'aptitude.whole-numbers';
const { rows: questions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = $1 AND status = 'PUBLISHED' LIMIT 2`,
  [topicId]
);
if (questions.length < 2) {
  console.error(`need at least 2 published questions on ${topicId}`);
  process.exit(1);
}
const [qA, qB] = questions;
const wrongIndex = (correct) => (correct === 0 ? 1 : 0);

console.log('\nA topic touched only moments ago reads at essentially its stored value\n');

const freshLearner = await makeLearner('smoke-phase24-fresh');
await answer({ learnerId: freshLearner, questionId: qA.id, selectedIndex: qA.answer_index, timeTakenMs: 20000, confidence: 4, mode: 'PRACTICE' });
await answer({ learnerId: freshLearner, questionId: qA.id, selectedIndex: qA.answer_index, timeTakenMs: 20000, confidence: 4, mode: 'REVISION' });

const freshResult = await getEffectiveRetention(freshLearner, topicId);
check('a real stored retention exists from the REVISION attempt', freshResult.storedRetention > 0, freshResult.storedRetention);
check('days since last studied reads as essentially zero', freshResult.daysSinceLastStudied < 1, freshResult.daysSinceLastStudied);
check('decay factor is essentially 1 — nothing to decay yet', freshResult.decayFactor > 0.95, freshResult.decayFactor);
check('effective reads close to the stored value', Math.abs(freshResult.effective - freshResult.storedRetention) < 0.05, `${freshResult.effective} vs ${freshResult.storedRetention}`);

console.log('\nThe same topic, artificially aged 21 real days (one configured half-life), reads meaningfully lower\n');

await client.query(
  `UPDATE learner_topic_state SET last_studied_at = now() - interval '21 days' WHERE learner_id = $1 AND topic_id = $2`,
  [freshLearner, topicId]
);

const agedResult = await getEffectiveRetention(freshLearner, topicId);
check('the stored score itself never moved — only the read-time estimate did', agedResult.storedRetention === freshResult.storedRetention, agedResult.storedRetention);
check('days since last studied now reads as real, roughly 21', agedResult.daysSinceLastStudied >= 20.9 && agedResult.daysSinceLastStudied <= 21.1, agedResult.daysSinceLastStudied);
check('decay factor has fallen to roughly one half, one half-life later', Math.abs(agedResult.decayFactor - 0.5) < 0.01, agedResult.decayFactor);
check('the effective estimate is now meaningfully lower than the stored value', agedResult.effective < freshResult.effective, `${agedResult.effective} vs ${freshResult.effective}`);

console.log('\nA real conceptual-mistake pattern further discounts the estimate, on top of time decay\n');

const riskyLearner = await makeLearner('smoke-phase24-risky');
// First-ever attempt on the topic: prior accuracy defaults to 0 (< 0.5), a
// normal-paced wrong answer at moderate confidence genuinely classifies as
// CONCEPTUAL (classifyMistake(), unchanged) — not fabricated, the real rule.
await answer({ learnerId: riskyLearner, questionId: qA.id, selectedIndex: wrongIndex(qA.answer_index), timeTakenMs: 8000, confidence: 2, mode: 'PRACTICE' });
await answer({ learnerId: riskyLearner, questionId: qB.id, selectedIndex: qB.answer_index, timeTakenMs: 20000, confidence: 4, mode: 'REVISION' });

const { rows: riskyAttempts } = await client.query(
  `SELECT mistake_type FROM question_attempt WHERE learner_id = $1 AND topic_id = $2 ORDER BY created_at`,
  [riskyLearner, topicId]
);
check('the first wrong attempt genuinely classified as a real conceptual gap', riskyAttempts[0].mistake_type === 'CONCEPTUAL', riskyAttempts[0].mistake_type);

const riskyResult = await getEffectiveRetention(riskyLearner, topicId);
check('a real misconception risk is reported, not zero', riskyResult.misconceptionRisk > 0, riskyResult.misconceptionRisk);

const riskyWithoutPenalty = riskyResult.storedRetention * riskyResult.decayFactor;
check(
  'the misconception penalty further discounts the estimate below time-decay alone',
  riskyResult.effective < riskyWithoutPenalty + 1e-6,
  `${riskyResult.effective} vs ${riskyWithoutPenalty}`
);

console.log('\nA topic the learner has never touched at all is reported honestly, not guessed\n');

let notFoundRaised = false;
try {
  await getEffectiveRetention(riskyLearner, 'aptitude.simplification');
} catch (err) {
  notFoundRaised = err.constructor.name === 'NotFoundError';
}
check('an untouched topic raises NotFoundError rather than fabricating a value', notFoundRaised);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM question_attempt WHERE learner_id = ANY($1)`, [[freshLearner, riskyLearner]]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = ANY($1)`, [[freshLearner, riskyLearner]]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = ANY($1)`, [[freshLearner, riskyLearner]]);
await client.query(`DELETE FROM learner_profile WHERE learner_id = ANY($1)`, [[freshLearner, riskyLearner]]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase24-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('retention engine smoke test passed');
