#!/usr/bin/env node
// Phase 16 exit test, against a real database:
//
//   DATABASE_URL=... node tests/weekly-plan.smoke.mjs
//
// "The weekly assignment is generated from actual learner evidence." Proves
// it by generating the plan twice for the same real learner on the real
// seeded syllabus — once untouched, once after real progress and a real
// weak topic — and showing the plan actually changes with the evidence.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getWeeklyPlan } from '../src/services/weeklyPlanService.mjs';

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

console.log('\nA brand new learner gets a plan that is honest about having no evidence\n');

const learner = await makeLearner('smoke-phase16-weekly');
const freshPlan = await getWeeklyPlan(learner);

check('all seven days are present', Object.keys(freshPlan.days).length === 7);
check('Monday targets the one real prerequisite-free topic (whole-numbers), same as Phase 7', freshPlan.days.MONDAY.topicId === 'aptitude.whole-numbers');
check('Wednesday (revision) is honest about nothing due yet', freshPlan.days.WEDNESDAY.dueCount === 0);
check('Thursday finds real PYQ-tagged content even for a fresh learner (it is topic-level, not learner-specific content)', freshPlan.days.THURSDAY.topicId !== null);
check('Friday is marked unavailable — no game engine exists', freshPlan.days.FRIDAY.available === false);
check('Saturday is honest that she is not yet eligible for the Default Foundation Test', freshPlan.days.SATURDAY.assessmentType === null);
check('Sunday always points at the weekly test', freshPlan.days.SUNDAY.type === 'WEEKLY_TEST');

console.log('\nAfter real progress and a real weak topic, the plan changes with the evidence\n');

const { rows: fractionsQuestions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.fractions' AND status = 'PUBLISHED' LIMIT 8`
);
for (const q of fractionsQuestions) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({
      client: dbClient,
      learnerId: learner,
      questionId: q.id,
      attemptId: crypto.randomUUID(),
      selectedIndex: (q.answer_index + 1) % 4, // every answer wrong — a real, weak topic
      timeTakenMs: 20000,
      confidence: 2,
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

const updatedPlan = await getWeeklyPlan(learner);
check(
  "Tuesday's practice day now targets the real weak topic (fractions), driven by live classification",
  updatedPlan.days.TUESDAY.topicId === 'aptitude.fractions',
  updatedPlan.days.TUESDAY.topicId
);
check('the plan genuinely differs from the fresh learner\'s plan', JSON.stringify(updatedPlan.days.TUESDAY) !== JSON.stringify(freshPlan.days.TUESDAY));

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase16-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('weekly plan smoke test passed');
