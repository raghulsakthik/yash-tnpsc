#!/usr/bin/env node
// Phase 15 exit test, against a real database:
//
//   DATABASE_URL=... node tests/test-comparison.smoke.mjs
//
// Proves the main feedback loop end to end: TEST 1 -> (practice happens in
// between) -> TEST 2 -> COMPARISON, using two real, completed Phase 3
// Default Foundation Tests for the same learner — not synthetic diagnostic
// objects, the genuine stored output of submitDefaultAssessment().

import crypto from 'node:crypto';
import pg from 'pg';
import {
  checkDefaultAssessmentEligibility,
  startDefaultAssessment,
  saveDefaultAssessmentAnswer,
  submitDefaultAssessment,
} from '../src/services/defaultAssessmentService.mjs';
import { compareLatestAssessments } from '../src/services/testComparisonService.mjs';
import { evaluateInterventionAcrossTests } from '../src/services/interventionEffectivenessService.mjs';
import { startIntervention } from '../src/services/interventionService.mjs';

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

async function takeDefaultAssessment(learnerId, { fractionsCorrectRate }) {
  const assessment = await startDefaultAssessment(learnerId);
  const { rows: keyRows } = await client.query(
    `SELECT aq.question_id, q.topic_id, q.answer_index, jsonb_array_length(q.options) AS option_count
       FROM assessment_question aq JOIN question q ON q.id = aq.question_id
      WHERE aq.assessment_id = $1 ORDER BY aq.question_id`,
    [assessment.assessmentId]
  );

  const totalFractionsQuestions = keyRows.filter((r) => r.topic_id === 'aptitude.fractions').length;
  const correctFractionsCount = Math.round(totalFractionsQuestions * fractionsCorrectRate);

  let fractionsSeen = 0;
  for (const row of keyRows) {
    const isFractions = row.topic_id === 'aptitude.fractions';
    const makeWrong = isFractions && fractionsSeen >= correctFractionsCount;
    if (isFractions) fractionsSeen += 1;
    await saveDefaultAssessmentAnswer(assessment.assessmentId, {
      questionId: row.question_id,
      selectedIndex: makeWrong ? (row.answer_index + 1) % row.option_count : row.answer_index,
      timeTakenMs: 15000,
      confidence: 3,
    });
  }
  return submitDefaultAssessment(assessment.assessmentId, learnerId);
}

console.log('\nWith fewer than 2 completed assessments, comparison is honest, not fabricated\n');

const learner = await makeLearner('smoke-phase15-comparison');
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

const zeroComparison = await compareLatestAssessments(learner);
check('with zero assessments taken, comparison says so honestly', zeroComparison.comparable === false);

console.log('\nTEST 1: she struggles on fractions\n');

const test1 = await takeDefaultAssessment(learner, { fractionsCorrectRate: 0.2 });
const fractions1 = test1.diagnostic.topics.find((t) => t.topicId === 'aptitude.fractions');
check('test 1 fractions accuracy is low, as arranged', fractions1.accuracy < 40, fractions1.accuracy);

const oneTestComparison = await compareLatestAssessments(learner);
check('with only 1 completed assessment, comparison still says so honestly', oneTestComparison.comparable === false);

console.log('\nAn intervention is started on the real weak topic\n');

const intervention = await startIntervention(learner, 'aptitude.fractions');
check('an intervention was started, tagged with a real recommendation', typeof intervention.interventionType === 'string');

console.log('\nTEST 2: real improvement on fractions\n');

// No reset needed: test 1's own attempts already left attempt_count >= 1
// on every candidate topic, so she's still eligible for a second Default
// Assessment, same as a real learner returning later would be.
const test2 = await takeDefaultAssessment(learner, { fractionsCorrectRate: 0.9 });
const fractions2 = test2.diagnostic.topics.find((t) => t.topicId === 'aptitude.fractions');
check('test 2 fractions accuracy is high, as arranged', fractions2.accuracy > 80, fractions2.accuracy);

console.log('\nCOMPARISON: test 1 -> test 2\n');

const comparison = await compareLatestAssessments(learner);
check('two completed assessments are now comparable', comparison.comparable === true);
const fractionsComparison = comparison.topics.find((t) => t.topicId === 'aptitude.fractions');
check('fractions shows a large, real accuracy gain', fractionsComparison.accuracyGain > 50, fractionsComparison.accuracyGain);
check(
  'the next-step decision is CONTINUE or STOP — real, substantive progress, not CHANGE/ESCALATE',
  ['CONTINUE', 'STOP'].includes(fractionsComparison.nextStep.decision),
  fractionsComparison.nextStep.decision
);

const effectiveness = await evaluateInterventionAcrossTests(learner, 'aptitude.fractions');
check('the intervention effectiveness view ties the real tracked intervention to the real comparison', effectiveness.intervention?.id === intervention.id);
check('its comparison matches the same gain', effectiveness.comparison.accuracyGain === fractionsComparison.accuracyGain);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM intervention WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM assessment_answer WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [learner]);
await client.query(`DELETE FROM assessment_question WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [learner]);
await client.query(`DELETE FROM assessment WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase15-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('test-to-test comparison smoke test passed');
