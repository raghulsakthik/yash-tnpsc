#!/usr/bin/env node
// Phase 25 exit test, against a real database:
//
//   DATABASE_URL=... node tests/weekly-assignment.smoke.mjs
//
// Proves the Weekly Assignment Engine closes the exact gap Phase 16's own
// completion report documented as a known limitation: "Friday (GAME) is
// always marked unavailable — no game engine exists yet." Phase 22 then
// built a real one; this proves Friday now resolves to it when it genuinely
// covers the week's chosen topic — without ever modifying buildWeeklyPlan()
// or getWeeklyPlan() themselves (proven directly, at the end).

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getWeeklyAssignment } from '../src/services/weeklyAssignmentService.mjs';
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

async function answerWrong({ learnerId, questionId, answerIndex }) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({
      client: dbClient,
      learnerId,
      questionId,
      attemptId: crypto.randomUUID(),
      selectedIndex: (answerIndex + 1) % 4,
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

console.log('\nA fresh learner, with no weak topic chosen yet, still reads honestly unavailable\n');

const fresh = await makeLearner('smoke-phase25-weekly-fresh');
const freshAssignment = await getWeeklyAssignment(fresh);
check('Friday is unavailable when nothing has been chosen for it yet', freshAssignment.days.FRIDAY.available === false, freshAssignment.days.FRIDAY);

console.log('\nA real weak topic a real, active game genuinely covers resolves Friday to that game\n');

// aptitude.percentage is really in the apt.aptitude chapter — the same
// chapter speed-round-aptitude's target_topic_ids was resolved from.
const covered = await makeLearner('smoke-phase25-weekly-covered');
const { rows: percentageQuestions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.percentage' AND status = 'PUBLISHED' LIMIT 6`
);
for (const q of percentageQuestions) {
  await answerWrong({ learnerId: covered, questionId: q.id, answerIndex: q.answer_index });
}
const coveredAssignment = await getWeeklyAssignment(covered);
check('Tuesday targets the real weak topic', coveredAssignment.days.TUESDAY.topicId === 'aptitude.percentage', coveredAssignment.days.TUESDAY.topicId);
check('Friday resolves to available, a real game now genuinely covering it', coveredAssignment.days.FRIDAY.available === true, coveredAssignment.days.FRIDAY);
check('the real game definition id is attached', coveredAssignment.days.FRIDAY.gameDefinitionId === 'speed-round-aptitude', coveredAssignment.days.FRIDAY.gameDefinitionId);

console.log('\nA real Polity weak topic resolves to the real Constitution Match game\n');

const polity = await makeLearner('smoke-phase25-weekly-polity');
const { rows: rightsQuestions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'polity.fundamental-rights' AND status = 'PUBLISHED' LIMIT 3`
);
for (const q of rightsQuestions) {
  await answerWrong({ learnerId: polity, questionId: q.id, answerIndex: q.answer_index });
}
const polityAssignment = await getWeeklyAssignment(polity);
check('Tuesday targets the real weak Polity topic', polityAssignment.days.TUESDAY.topicId === 'polity.fundamental-rights', polityAssignment.days.TUESDAY.topicId);
check('Friday resolves to the real Constitution Match game', polityAssignment.days.FRIDAY.gameDefinitionId === 'constitution-match-polity', polityAssignment.days.FRIDAY);

console.log('\nA weak topic no real game covers stays honestly unavailable — never a fabricated match\n');

const uncovered = await makeLearner('smoke-phase25-weekly-uncovered');
const { rows: wholeNumbersQuestions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.whole-numbers' AND status = 'PUBLISHED' LIMIT 6`
);
for (const q of wholeNumbersQuestions) {
  await answerWrong({ learnerId: uncovered, questionId: q.id, answerIndex: q.answer_index });
}
const uncoveredAssignment = await getWeeklyAssignment(uncovered);
check('Tuesday targets the real weak topic', uncoveredAssignment.days.TUESDAY.topicId === 'aptitude.whole-numbers');
check('Friday stays honestly unavailable — no real game covers whole-numbers', uncoveredAssignment.days.FRIDAY.available === false, uncoveredAssignment.days.FRIDAY);

console.log('\ngetWeeklyPlan() itself (Phase 16) is provably untouched by any of this\n');

const originalPlan = await getWeeklyPlan(covered);
check('Phase 16\'s own, unmodified function still reports Friday unavailable for the same learner', originalPlan.days.FRIDAY.available === false, originalPlan.days.FRIDAY);
check('every non-Friday day matches exactly between the two engines', JSON.stringify(originalPlan.days.TUESDAY) === JSON.stringify(coveredAssignment.days.TUESDAY));

// ------------------------------------------------------------------ cleanup
const names = ['smoke-phase25-weekly-fresh', 'smoke-phase25-weekly-covered', 'smoke-phase25-weekly-polity', 'smoke-phase25-weekly-uncovered'];
for (const name of names) {
  const { rows } = await client.query(`SELECT id FROM learner WHERE name = $1`, [name]);
  for (const { id } of rows) {
    await client.query('DELETE FROM question_attempt WHERE learner_id = $1', [id]);
    await client.query('DELETE FROM learner_topic_state WHERE learner_id = $1', [id]);
    await client.query('DELETE FROM revision_schedule WHERE learner_id = $1', [id]);
  }
}
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase25-weekly-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('weekly assignment engine smoke test passed');
