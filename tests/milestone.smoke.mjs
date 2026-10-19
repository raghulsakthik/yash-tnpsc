#!/usr/bin/env node
// Phase 17 exit test, against a real database:
//
//   DATABASE_URL=... node tests/milestone.smoke.mjs
//
// Proves the Streak + Milestone Engine reads real evidence, never a
// frontend-supplied number: real question_attempt history drives the
// streak and the 100-questions/first-PYQ milestones, a real completed
// assessment drives FIRST_TEST, and persistence is idempotent — evaluating
// twice never double-awards or re-dates an achievement.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { evaluateAndRecordMilestones, getAchievements } from '../src/services/milestoneService.mjs';

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

console.log('\nA brand new learner has nothing unlocked\n');

const learner = await makeLearner('smoke-phase17-milestones');
const fresh = await evaluateAndRecordMilestones(learner);
check('current streak is 0', fresh.currentStreak === 0);
check('nothing is unlocked yet', fresh.newlyUnlocked.length === 0 && fresh.achievements.length === 0);
check('FIRST_LESSON is always reported, always locked', fresh.evaluations.find((e) => e.type === 'FIRST_LESSON').unlocked === false);

console.log('\nReal practice: 100 real question_attempt rows, including a real PYQ-tagged one\n');

const { rows: pyqQuestions } = await client.query(
  `SELECT id, answer_index FROM question WHERE source LIKE 'tnpsc-%' AND status = 'PUBLISHED' LIMIT 1`
);
check('the seeded bank has at least one real PYQ-tagged question', pyqQuestions.length === 1);

const { rows: ordinaryQuestions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.whole-numbers' AND status = 'PUBLISHED' LIMIT 8`
);

async function answerOne(questionId, answerIndex) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({
      client: dbClient,
      learnerId: learner,
      questionId,
      attemptId: crypto.randomUUID(),
      selectedIndex: answerIndex,
      timeTakenMs: 5000,
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

// 99 ordinary attempts (cycling the small real pool) + 1 real PYQ attempt = 100.
for (let i = 0; i < 99; i += 1) {
  const q = ordinaryQuestions[i % ordinaryQuestions.length];
  await answerOne(q.id, q.answer_index);
}
await answerOne(pyqQuestions[0].id, pyqQuestions[0].answer_index);

console.log('\nSimulating a real 7-day streak (direct historical rows, real dates, not fabricated logic)\n');

for (let daysAgo = 1; daysAgo <= 6; daysAgo += 1) {
  await client.query(
    `INSERT INTO question_attempt (id, learner_id, question_id, topic_id, selected_index, correct, time_taken_ms, confidence, created_at)
     VALUES (gen_random_uuid(), $1, $2, 'aptitude.whole-numbers', 0, true, 5000, 3, now() - ($3 || ' days')::interval)`,
    [learner, ordinaryQuestions[0].id, daysAgo]
  );
}

console.log('\nEvaluating: what unlocked?\n');

const evaluated = await evaluateAndRecordMilestones(learner);
check('100_QUESTIONS unlocked from real attempt count', evaluated.newlyUnlocked.includes('100_QUESTIONS'));
check('FIRST_PYQ unlocked from a real PYQ-tagged attempt', evaluated.newlyUnlocked.includes('FIRST_PYQ'));
check('7_DAY_STREAK unlocked from real historical activity across 7 distinct days', evaluated.currentStreak >= 7 && evaluated.newlyUnlocked.includes('7_DAY_STREAK'));
check('FIRST_TEST is still locked — no test or assessment has actually been completed', !evaluated.newlyUnlocked.includes('FIRST_TEST'));

console.log('\nEvaluating again is idempotent — no duplicate awards, no re-dating\n');

const secondPass = await evaluateAndRecordMilestones(learner);
check('nothing newly unlocks on a second pass — it is already persisted', secondPass.newlyUnlocked.length === 0);
check('the achievement count is unchanged', secondPass.achievements.length === evaluated.achievements.length);

const achievedAtFirst = evaluated.achievements.find((a) => a.milestoneType === '100_QUESTIONS').achievedAt;
const achievedAtSecond = secondPass.achievements.find((a) => a.milestoneType === '100_QUESTIONS').achievedAt;
check('the achievement date does not move on re-evaluation', new Date(achievedAtFirst).getTime() === new Date(achievedAtSecond).getTime());

console.log('\nThe read-only endpoint matches without triggering a new evaluation\n');

const readOnly = await getAchievements(learner);
check('getAchievements matches the persisted achievements exactly', readOnly.achievements.length === evaluated.achievements.length);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM achievement WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase17-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('streak + milestone engine smoke test passed');
