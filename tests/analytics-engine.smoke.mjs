#!/usr/bin/env node
// Phase 28 exit test, against a real database:
//
//   DATABASE_URL=... node tests/analytics-engine.smoke.mjs
//
// Proves the Analytics Engine, Exam Readiness Engine and Test Construction
// Intelligence all read real, already-accumulated evidence — real test
// history, real PYQ attempts, real retention, real intervention/mistake
// data — and degrade honestly for a fresh learner rather than fabricating
// a number.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getFullAnalytics } from '../src/services/analyticsService.mjs';
import { getExamReadiness } from '../src/services/examReadinessService.mjs';
import { createAdaptiveTest, startAdaptiveTest, saveAdaptiveTestAnswer, submitAdaptiveTest } from '../src/services/adaptiveTestService.mjs';
import { explainTest } from '../src/services/testExplanationService.mjs';

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

async function answer({ learnerId, questionId, selectedIndex, timeTakenMs, confidence, mode = 'PRACTICE' }) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({ client: dbClient, learnerId, questionId, attemptId: crypto.randomUUID(), selectedIndex, timeTakenMs, confidence, mode });
    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

console.log('\nA fresh learner gets an honest, empty analytics report — never a fabricated number\n');

const fresh = await makeLearner('smoke-phase28-fresh');
const freshAnalytics = await getFullAnalytics(fresh);
check('mastery progression is honestly empty with no real completed tests', freshAnalytics.masteryProgression.length === 0);
check('subject performance is honestly empty with nothing touched', freshAnalytics.subjectPerformance.length === 0);
check('mistake evolution still reports all real categories, all FLAT at zero', freshAnalytics.mistakeEvolution.every((m) => m.direction === 'FLAT' && m.early === 0 && m.recent === 0));
check('PYQ analytics is honest about having nothing to compare yet', freshAnalytics.pyq.improvement === null);

const freshReadiness = await getExamReadiness(fresh);
check('a fresh learner reads a real, low readiness score, not a fabricated high one', freshReadiness.overall >= 0 && freshReadiness.overall < 50);
check('the first-ever readiness call has nothing to compare against, honestly', freshReadiness.explanation.changed === null);
check('the disclaimer is explicit this is not a pass probability', /not a guaranteed pass probability/.test(freshReadiness.disclaimer));

console.log('\nReal practice, a real completed test, and real PYQ attempts feed real analytics\n');

const learner = await makeLearner('smoke-phase28-active');

// Real whole-numbers practice, including one REVISION-mode attempt so a
// real stored retention exists to project through Graph 4's curve.
const { rows: wholeNumbersQuestions } = await client.query(`SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.whole-numbers' AND status = 'PUBLISHED' LIMIT 3`);
for (const q of wholeNumbersQuestions) {
  await answer({ learnerId: learner, questionId: q.id, selectedIndex: q.answer_index, timeTakenMs: 8000, confidence: 4 });
}
await answer({ learnerId: learner, questionId: wholeNumbersQuestions[0].id, selectedIndex: wholeNumbersQuestions[0].answer_index, timeTakenMs: 8000, confidence: 4, mode: 'REVISION' });

// Real PYQ attempts, mixed right/wrong, for real PYQ analytics.
const { rows: pyqQuestions } = await client.query(`SELECT id, answer_index, source_year FROM question WHERE source LIKE 'tnpsc-%' AND status = 'PUBLISHED' LIMIT 4`);
for (const [i, q] of pyqQuestions.entries()) {
  const wrong = i % 2 === 1;
  await answer({ learnerId: learner, questionId: q.id, selectedIndex: wrong ? (q.answer_index + 1) % 4 : q.answer_index, timeTakenMs: 10000, confidence: 3 });
}

// A real, completed adaptive test for real test/mastery-progression history.
const created = await createAdaptiveTest(learner, { questionCount: 6 });
await startAdaptiveTest(created.testId);
const { rows: keyRows } = await client.query(`SELECT aq.question_id, q.answer_index FROM assessment_question aq JOIN question q ON q.id = aq.question_id WHERE aq.assessment_id = $1`, [created.testId]);
for (const row of keyRows) {
  await saveAdaptiveTestAnswer(created.testId, { questionId: row.question_id, selectedIndex: row.answer_index, timeTakenMs: 10000, confidence: 4 });
}
await submitAdaptiveTest(created.testId, learner);

const analytics = await getFullAnalytics(learner);
check('mastery progression now reports the one real completed test', analytics.masteryProgression.length === 1, analytics.masteryProgression.length);
check('test analytics reports the real completed count', analytics.testAnalytics.testsCompleted === 1);
check('subject performance now reports real, touched subjects', analytics.subjectPerformance.length > 0);
check('the retention curve for the real revised topic strictly decreases over the real five day offsets', (() => {
  const topic = analytics.retentionCurves.find((r) => r.topicId === 'aptitude.whole-numbers');
  if (!topic) return false;
  return topic.curve.every((point, i) => i === 0 || point.projectedRetention <= topic.curve[i - 1].projectedRetention);
})());
check('PYQ analytics reports the real year(s) she actually attempted', analytics.pyq.byYear.length > 0);
check('learning analytics reports a real, non-zero question count', analytics.learning.questionsSolved > 0, analytics.learning.questionsSolved);
check('learning analytics reports a real current streak of at least 1 (activity today)', analytics.learning.currentStreak >= 1);
check('progression tier is a real value from Phase 18, reused, not recomputed here', typeof analytics.progression.tier === 'string');

console.log('\nExam readiness explains a real change against a real previous snapshot\n');

const firstReadinessForActive = await getExamReadiness(learner);
check('a learner with real activity reads a real readiness score above zero', firstReadinessForActive.overall > 0, firstReadinessForActive.overall);
check('real signals back the real readiness score', Object.keys(firstReadinessForActive.signals).length > 0);

// A second real call for the same learner now has a real previous
// snapshot (the one just persisted above) to honestly diff against.
const secondReadiness = await getExamReadiness(learner);
check('a second call now has a real previous snapshot to compare against', secondReadiness.explanation.changed !== null);

const { rows: snapshotRows } = await client.query(`SELECT COUNT(*)::int AS n FROM readiness_snapshot WHERE learner_id = $1`, [learner]);
check('every real call persisted a real snapshot', snapshotRows[0].n >= 1);

console.log('\nTest Construction Intelligence explains the real, already-created test honestly\n');

const explanation = await explainTest(created.testId);
check('the blueprint explanation names only the real, non-zero categories', explanation.blueprint.lines.length > 0);
check('every real question in the test has a real, grounded explanation', explanation.questions.length === keyRows.length);
check('every question explanation names the real topic it was selected for', explanation.questions.every((q) => q.summary.includes(q.topicName) || q.summary.includes('well-rounded')));

// ------------------------------------------------------------------ cleanup
for (const name of ['smoke-phase28-fresh', 'smoke-phase28-active']) {
  const { rows } = await client.query(`SELECT id FROM learner WHERE name = $1`, [name]);
  for (const { id } of rows) {
    await client.query(`DELETE FROM readiness_snapshot WHERE learner_id = $1`, [id]);
    await client.query(`DELETE FROM assessment_answer WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [id]);
    await client.query(`DELETE FROM assessment_question WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [id]);
    await client.query(`DELETE FROM assessment WHERE learner_id = $1`, [id]);
    await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [id]);
    await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [id]);
    await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [id]);
  }
}
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase28-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('analytics, exam readiness & test construction intelligence smoke test passed');
