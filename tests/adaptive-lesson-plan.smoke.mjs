#!/usr/bin/env node
// Phase 12 exit test, against a real database:
//
//   DATABASE_URL=... node tests/adaptive-lesson-plan.smoke.mjs
//
// "The same initial curriculum can produce different backend-generated
// learning plans." Proves it with two real learners on the identical,
// real seeded syllabus: one who is confidently wrong on fractions (a real
// prerequisite gap, cascading into whatever depends on it) and one who is
// simply slow but accurate everywhere — and shows the plan never stops at
// the first topic that needs work, unlike Phase 5's buildLearningPath.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getAdaptiveLessonPlan } from '../src/services/adaptiveLessonPlanService.mjs';

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

async function answer(learnerId, topicId, plan) {
  const { rows: questions } = await client.query(
    `SELECT id, answer_index FROM question WHERE topic_id = $1 AND status = 'PUBLISHED' LIMIT $2`,
    [topicId, plan.length]
  );
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const { correct, timeTakenMs, confidence } = plan[i];
    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');
      await recordAttempt({
        client: dbClient,
        learnerId,
        questionId: q.id,
        attemptId: crypto.randomUUID(),
        selectedIndex: correct ? q.answer_index : (q.answer_index + 1) % 4,
        timeTakenMs,
        confidence,
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
}

console.log('\nLearner A: confidently wrong on fractions — a real prerequisite gap\n');

const learnerA = await makeLearner('smoke-phase12-weak');
await answer(learnerA, 'aptitude.fractions', Array.from({ length: 8 }, () => ({ correct: false, timeTakenMs: 20000, confidence: 5 })));
const planA = await getAdaptiveLessonPlan(learnerA);

check('the plan is non-empty', planA.steps.length > 0);
check(
  'fractions gets some kind of remediation step, not plain ADVANCE',
  planA.steps.some((s) => s.topicId === 'aptitude.fractions' && s.type !== 'ADVANCE')
);
check(
  'the plan still includes topics after fractions — it does not stop at the first problem',
  planA.steps.some((s) => s.topicId === 'aptitude.percentage' || s.topicId === 'aptitude.decimals')
);

console.log('\nLearner B: accurate everywhere, no prerequisite issues\n');

const learnerB = await makeLearner('smoke-phase12-strong');
for (const topicId of planA.syllabusOrder) {
  await answer(learnerB, topicId, Array.from({ length: 5 }, () => ({ correct: true, timeTakenMs: 9000, confidence: 4 })));
}
const planB = await getAdaptiveLessonPlan(learnerB);

check('learner B is not forced through fractions remediation — she never got it wrong', !planB.steps.some((s) => s.type === 'PREREQUISITE_LESSON'));

console.log('\nSame syllabus, different learners, different plans\n');

check(
  'the same syllabusOrder produced two different step sequences',
  JSON.stringify(planA.steps) !== JSON.stringify(planB.steps)
);
check('both plans walk the identical syllabus order', JSON.stringify(planA.syllabusOrder) === JSON.stringify(planB.syllabusOrder));

// ------------------------------------------------------------------ cleanup
for (const name of ['smoke-phase12-weak', 'smoke-phase12-strong']) {
  const { rows } = await client.query(`SELECT id FROM learner WHERE name = $1`, [name]);
  for (const { id } of rows) {
    await client.query('DELETE FROM question_attempt WHERE learner_id = $1', [id]);
    await client.query('DELETE FROM learner_topic_state WHERE learner_id = $1', [id]);
    await client.query('DELETE FROM revision_schedule WHERE learner_id = $1', [id]);
  }
}
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase12-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('adaptive lesson plan smoke test passed');
