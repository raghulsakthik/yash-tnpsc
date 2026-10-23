#!/usr/bin/env node
// Phase 13 exit test, against a real database:
//
//   DATABASE_URL=... node tests/mastery-gate.smoke.mjs
//
// The gate's whole point, proven against real data: high practice-only
// mastery is NOT enough to call a topic MASTERED — it stays NEAR_MASTERY
// until a real, completed Default Foundation Test (Phase 3) independently
// confirms it, at which point the gate actually opens.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getMasteryGate } from '../src/services/masteryGateService.mjs';
import {
  checkDefaultAssessmentEligibility,
  startDefaultAssessment,
  saveDefaultAssessmentAnswer,
  submitDefaultAssessment,
} from '../src/services/defaultAssessmentService.mjs';

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

console.log('\nAn untouched topic is FOUNDATION_REQUIRED, not an error\n');

const fresh = await makeLearner('smoke-phase13-fresh');
const freshGate = await getMasteryGate(fresh, 'aptitude.whole-numbers');
check('an untouched topic reads FOUNDATION_REQUIRED', freshGate.status === 'FOUNDATION_REQUIRED');
check('it is not ready to progress', freshGate.ready === false);

console.log('\nStrong practice alone is not enough — NEAR_MASTERY, not MASTERED\n');

const learner = await makeLearner('smoke-phase13-practiced');
const { rows: questions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.whole-numbers' AND status = 'PUBLISHED' LIMIT 8`
);
for (const q of questions) {
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
      confidence: 5,
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

const practicedGate = await getMasteryGate(learner, 'aptitude.whole-numbers');
check(
  'strong practice-only performance reads NEAR_MASTERY, not MASTERED',
  practicedGate.status === 'NEAR_MASTERY',
  practicedGate.status
);
check('it is not yet ready to progress', practicedGate.ready === false);
check('the reason names the missing assessment confirmation', /no assessment/.test(practicedGate.reason));

console.log('\nA real, completed Default Foundation Test confirms it — the gate opens\n');

// Give her exposure across the candidate set so the Default Assessment is
// eligible, then take it and answer whole-numbers correctly throughout.
const { rows: candidateTopics } = await client.query(
  `WITH foundation AS (SELECT id FROM topic WHERE chapter_id = 'apt.foundation'),
        dependents AS (SELECT DISTINCT tp.topic_id AS id FROM topic_prerequisite tp WHERE tp.prerequisite_topic_id IN (SELECT id FROM foundation))
   SELECT id FROM topic WHERE id IN (SELECT id FROM foundation UNION SELECT id FROM dependents)`
);
for (const { id } of candidateTopics) {
  await client.query(
    `INSERT INTO learner_topic_state (learner_id, topic_id, attempt_count, correct_count)
     VALUES ($1, $2, 1, 1) ON CONFLICT (learner_id, topic_id) DO UPDATE SET attempt_count = GREATEST(learner_topic_state.attempt_count, 1)`,
    [learner, id]
  );
}

const eligibility = await checkDefaultAssessmentEligibility(learner);
check('the learner is eligible for the Default Foundation Test', eligibility.eligible);

const assessment = await startDefaultAssessment(learner);
const { rows: keyRows } = await client.query(
  `SELECT aq.question_id, q.topic_id, q.answer_index FROM assessment_question aq JOIN question q ON q.id = aq.question_id WHERE aq.assessment_id = $1`,
  [assessment.assessmentId]
);
for (const row of keyRows) {
  // Answer whole-numbers correctly throughout; everything else correct too
  // so nothing else distracts the diagnostic.
  await saveDefaultAssessmentAnswer(assessment.assessmentId, {
    questionId: row.question_id,
    selectedIndex: row.answer_index,
    timeTakenMs: 10000,
    confidence: 4,
  });
}
await submitDefaultAssessment(assessment.assessmentId, learner);

const confirmedGate = await getMasteryGate(learner, 'aptitude.whole-numbers');
check(
  'after a real completed assessment confirms it, the gate opens — MASTERED or RETAINED',
  confirmedGate.status === 'MASTERED' || confirmedGate.status === 'RETAINED',
  confirmedGate.status
);
check('ready is now true', confirmedGate.ready === true);
check('the evidence includes the assessment performance that unlocked it', confirmedGate.evidence.assessmentPerformance?.classification === 'STRONG');

// ------------------------------------------------------------------ cleanup
for (const name of ['smoke-phase13-fresh', 'smoke-phase13-practiced']) {
  const { rows } = await client.query(`SELECT id FROM learner WHERE name = $1`, [name]);
  for (const { id } of rows) {
    await client.query('DELETE FROM question_attempt WHERE learner_id = $1', [id]);
    await client.query('DELETE FROM learner_topic_state WHERE learner_id = $1', [id]);
  }
}
const { rows: assessmentLearnerRows } = await client.query(`SELECT id FROM learner WHERE name = 'smoke-phase13-practiced'`);
for (const { id } of assessmentLearnerRows) {
  await client.query(`DELETE FROM assessment_answer WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [id]);
  await client.query(`DELETE FROM assessment_question WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [id]);
  await client.query('DELETE FROM assessment WHERE learner_id = $1', [id]);
}
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase13-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('mastery gate smoke test passed');
