#!/usr/bin/env node
// Phase 25 exit test, against a real database:
//
//   DATABASE_URL=... node tests/completion-criteria.smoke.mjs
//
// Proves the Completion Criteria verdict — CONTINUE / STRENGTHEN / REVISE /
// REASSESS / MASTERED / RETAINED — reads real evidence end to end, composed
// entirely from phases already built and unchanged: Phase 13's mastery gate,
// Phase 6's prerequisite risk, Phase 11's revision-due check, Phase 24's
// effective retention.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getCompletionVerdict } from '../src/services/completionCriteriaService.mjs';
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

console.log('\nAn untouched topic reads CONTINUE, not an error\n');

const fresh = await makeLearner('smoke-phase25-fresh');
const freshVerdict = await getCompletionVerdict(fresh, 'aptitude.whole-numbers');
check('an untouched topic reads CONTINUE', freshVerdict.verdict === 'CONTINUE', freshVerdict.verdict);

console.log('\nOrdinary, mixed early practice (not yet near mastery) also reads CONTINUE\n');

const continuing = await makeLearner('smoke-phase25-continue');
const { rows: wholeNumbersQuestions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.whole-numbers' AND status = 'PUBLISHED' LIMIT 4`
);
for (const [i, q] of wholeNumbersQuestions.entries()) {
  const wrong = i % 2 === 1; // a real, mixed record — half right, half wrong, nowhere near mastery
  await answer({
    learnerId: continuing,
    questionId: q.id,
    selectedIndex: wrong ? (q.answer_index + 1) % 4 : q.answer_index,
    timeTakenMs: 10000,
    confidence: 2,
    mode: 'PRACTICE',
  });
}
const continueVerdict = await getCompletionVerdict(continuing, 'aptitude.whole-numbers');
check('ordinary, mixed early practice reads CONTINUE', continueVerdict.verdict === 'CONTINUE', continueVerdict.verdict);

console.log('\nA real, unmastered prerequisite calls for STRENGTHEN, before anything else\n');

// aptitude.division really depends on aptitude.whole-numbers (strength 0.8,
// real seeded topic_prerequisite row) — practicing division without ever
// touching whole-numbers is exactly the gap this verdict should catch.
const gapped = await makeLearner('smoke-phase25-strengthen');
const { rows: divisionQuestions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.division' AND status = 'PUBLISHED' LIMIT 4`
);
for (const q of divisionQuestions) {
  await answer({ learnerId: gapped, questionId: q.id, selectedIndex: q.answer_index, timeTakenMs: 10000, confidence: 2, mode: 'PRACTICE' });
}
const strengthenVerdict = await getCompletionVerdict(gapped, 'aptitude.division');
check('an unmastered real prerequisite calls for STRENGTHEN', strengthenVerdict.verdict === 'STRENGTHEN', strengthenVerdict.verdict);
check('the evidence names the real weakest prerequisite', strengthenVerdict.evidence.weakestPrerequisite?.topicId === 'aptitude.whole-numbers');

console.log('\nA formally due revision calls for REVISE\n');

// aptitude.whole-numbers is deliberately the one real, prerequisite-free
// topic (Phase 7's own foundation anchor) — so this isolates the revision
// trigger from the prerequisite one, which outranks it.
const revising = await makeLearner('smoke-phase25-revise');
const { rows: wholeNumbersQuestionsForRevise } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.whole-numbers' AND status = 'PUBLISHED' LIMIT 1`
);
await answer({
  learnerId: revising,
  questionId: wholeNumbersQuestionsForRevise[0].id,
  selectedIndex: wholeNumbersQuestionsForRevise[0].answer_index,
  timeTakenMs: 10000,
  confidence: 3,
  mode: 'PRACTICE',
});
// A real historical row, directly aged due — the same technique every
// earlier phase's smoke test uses to simulate elapsed time honestly.
await client.query(
  `UPDATE revision_schedule SET scheduled_at = now() - interval '1 day' WHERE learner_id = $1 AND topic_id = 'aptitude.whole-numbers'`,
  [revising]
);
const reviseVerdict = await getCompletionVerdict(revising, 'aptitude.whole-numbers');
check('a real, formally due revision calls for REVISE', reviseVerdict.verdict === 'REVISE', reviseVerdict.verdict);
check('the evidence reports the real revision-due flag', reviseVerdict.evidence.revisionDue === true);

console.log('\nHigh practice-only mastery, unconfirmed, calls for REASSESS — not a silent MASTERED\n');

const reassessing = await makeLearner('smoke-phase25-reassess');
const { rows: strongQuestions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.whole-numbers' AND status = 'PUBLISHED' LIMIT 8`
);
for (const q of strongQuestions) {
  await answer({ learnerId: reassessing, questionId: q.id, selectedIndex: q.answer_index, timeTakenMs: 8000, confidence: 5, mode: 'PRACTICE' });
}
const reassessVerdict = await getCompletionVerdict(reassessing, 'aptitude.whole-numbers');
check('strong practice-only mastery, unconfirmed by any assessment, calls for REASSESS', reassessVerdict.verdict === 'REASSESS', reassessVerdict.verdict);
check('the underlying mastery gate status is NEAR_MASTERY, not MASTERED', reassessVerdict.masteryGate.status === 'NEAR_MASTERY');

console.log('\nA real, completed Default Foundation Test confirms it — MASTERED or RETAINED\n');

const { rows: candidateTopics } = await client.query(
  `WITH foundation AS (SELECT id FROM topic WHERE chapter_id = 'apt.foundation'),
        dependents AS (SELECT DISTINCT tp.topic_id AS id FROM topic_prerequisite tp WHERE tp.prerequisite_topic_id IN (SELECT id FROM foundation))
   SELECT id FROM topic WHERE id IN (SELECT id FROM foundation UNION SELECT id FROM dependents)`
);
for (const { id } of candidateTopics) {
  await client.query(
    `INSERT INTO learner_topic_state (learner_id, topic_id, attempt_count, correct_count)
     VALUES ($1, $2, 1, 1) ON CONFLICT (learner_id, topic_id) DO UPDATE SET attempt_count = GREATEST(learner_topic_state.attempt_count, 1)`,
    [reassessing, id]
  );
}
const eligibility = await checkDefaultAssessmentEligibility(reassessing);
check('the learner is eligible for the Default Foundation Test', eligibility.eligible);

const assessment = await startDefaultAssessment(reassessing);
const { rows: keyRows } = await client.query(
  `SELECT aq.question_id, q.topic_id, q.answer_index FROM assessment_question aq JOIN question q ON q.id = aq.question_id WHERE aq.assessment_id = $1`,
  [assessment.assessmentId]
);
for (const row of keyRows) {
  await saveDefaultAssessmentAnswer(assessment.assessmentId, {
    questionId: row.question_id,
    selectedIndex: row.answer_index,
    timeTakenMs: 10000,
    confidence: 4,
  });
}
await submitDefaultAssessment(assessment.assessmentId, reassessing);

const confirmedVerdict = await getCompletionVerdict(reassessing, 'aptitude.whole-numbers');
check(
  'after real, independent confirmation, the verdict becomes MASTERED or RETAINED',
  confirmedVerdict.verdict === 'MASTERED' || confirmedVerdict.verdict === 'RETAINED',
  confirmedVerdict.verdict
);

// ------------------------------------------------------------------ cleanup
const names = ['smoke-phase25-fresh', 'smoke-phase25-continue', 'smoke-phase25-strengthen', 'smoke-phase25-revise', 'smoke-phase25-reassess'];
for (const name of names) {
  const { rows } = await client.query(`SELECT id FROM learner WHERE name = $1`, [name]);
  for (const { id } of rows) {
    await client.query(`DELETE FROM assessment_answer WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [id]);
    await client.query(`DELETE FROM assessment_question WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [id]);
    await client.query('DELETE FROM assessment WHERE learner_id = $1', [id]);
    await client.query('DELETE FROM question_attempt WHERE learner_id = $1', [id]);
    await client.query('DELETE FROM learner_topic_state WHERE learner_id = $1', [id]);
    await client.query('DELETE FROM revision_schedule WHERE learner_id = $1', [id]);
  }
}
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase25-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('completion criteria smoke test passed');
