#!/usr/bin/env node
// Phase 3 exit test, against a real database:
//
//   DATABASE_URL=... node tests/default-assessment.smoke.mjs
//
// Proves the Default Foundation Test end to end: a learner who isn't
// exposed to enough foundation topics is turned away, one who is can take
// the assessment, answering it writes real question_attempt rows (it's
// evidence into the same learner model, not a side system), and submitting
// produces the initial learner model this phase was asked for — a
// per-topic percentage report, e.g. "Fractions 42%, Decimals 71%, ..." —
// plus a prerequisite gap pointing a weak topic back at its weaker
// foundation.

import crypto from 'node:crypto';
import pg from 'pg';
import {
  checkDefaultAssessmentEligibility,
  startDefaultAssessment,
  getDefaultAssessment,
  saveDefaultAssessmentAnswer,
  submitDefaultAssessment,
} from '../src/services/defaultAssessmentService.mjs';
import { ValidationError } from '../src/services/errors.mjs';

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

console.log('\nA learner with no foundation exposure is not yet eligible\n');

const fresh = await makeLearner('smoke-phase3-fresh');
const freshEligibility = await checkDefaultAssessmentEligibility(fresh);
check('a brand new learner is not eligible yet', freshEligibility.eligible === false);
check('the candidate set is non-empty (foundation + its direct dependents)', freshEligibility.totalCount > 0);

let refusedCorrectly = false;
try {
  await startDefaultAssessment(fresh);
} catch (err) {
  refusedCorrectly = err instanceof ValidationError;
}
check('starting the assessment before eligibility is refused', refusedCorrectly);

console.log('\nA learner exposed to most foundation topics becomes eligible\n');

const learner = await makeLearner('smoke-phase3-exposed');

// Give the learner at least one attempt on every candidate topic except one
// (crossing the 60% exposure bar without needing every topic), via the same
// learner_topic_state table the real engine maintains.
const { rows: candidateTopics } = await client.query(
  `WITH foundation AS (SELECT id FROM topic WHERE chapter_id = 'apt.foundation'),
        dependents AS (
          SELECT DISTINCT tp.topic_id AS id FROM topic_prerequisite tp
           WHERE tp.prerequisite_topic_id IN (SELECT id FROM foundation)
        )
   SELECT id FROM topic WHERE id IN (SELECT id FROM foundation UNION SELECT id FROM dependents)`
);
check('the seeded syllabus produces a non-trivial candidate set', candidateTopics.length >= 8, `(got ${candidateTopics.length})`);

const exposedTopics = candidateTopics.slice(0, candidateTopics.length - 1).map((t) => t.id);
for (const topicId of exposedTopics) {
  await client.query(
    `INSERT INTO learner_topic_state (learner_id, topic_id, attempt_count, correct_count)
     VALUES ($1, $2, 1, 1)`,
    [learner, topicId]
  );
}

const eligibility = await checkDefaultAssessmentEligibility(learner);
check('exposure to most (not all) candidate topics is enough', eligibility.eligible === true);

console.log('\nStarting and answering the Default Foundation Test\n');

const assessment = await startDefaultAssessment(learner);
check('an assessment was created in progress', assessment.status === 'IN_PROGRESS');
check('it draws from more than one foundation-adjacent topic', new Set(assessment.questions.map((q) => q.topicId)).size >= 5);
check('it reports a sensible estimated time, not a stub', typeof assessment.estimatedMinutes === 'number' && assessment.estimatedMinutes > 0);

// Phase 9: fractions has 5 other candidate topics depending on it in the
// real seeded syllabus (decimals, percentage, ratio-and-proportion,
// simplification, time-and-work) — the highest fan-out of any candidate —
// so the weighted blueprint should give it more questions than a leaf topic
// nothing depends on, like hcf, out of the same fixed total budget.
const countByTopic = new Map();
for (const q of assessment.questions) countByTopic.set(q.topicId, (countByTopic.get(q.topicId) ?? 0) + 1);
check(
  'fractions (high fan-out) gets more questions than hcf (a leaf topic), from the same total budget',
  (countByTopic.get('aptitude.fractions') ?? 0) > (countByTopic.get('aptitude.hcf') ?? 0),
  `fractions=${countByTopic.get('aptitude.fractions')} hcf=${countByTopic.get('aptitude.hcf')}`
);

const resumed = await startDefaultAssessment(learner);
check('calling start again resumes the same in-progress assessment', resumed.assessmentId === assessment.assessmentId);

// Answer every question. Deliberately get every fractions question wrong
// (and confident about it), and every percentage question wrong too —
// percentage directly requires fractions in the seeded syllabus — so the
// diagnostic has something real to find: both topics should come back
// weak, and percentage's gap should trace back to the weaker of the two,
// fractions. saveDefaultAssessmentAnswer doesn't expose the answer key (by
// design — it mirrors the weekly test's "nothing revealed until
// submission"), so to arrange a specific outcome we read the answer keys
// directly here, the same way the weekly test's smoke test does.
const WEAK_TOPICS = new Set(['aptitude.fractions', 'aptitude.percentage']);
const { rows: keyRows } = await client.query(
  `SELECT aq.question_id, q.topic_id, q.answer_index, jsonb_array_length(q.options) AS option_count
     FROM assessment_question aq JOIN question q ON q.id = aq.question_id
    WHERE aq.assessment_id = $1`,
  [assessment.assessmentId]
);
for (const row of keyRows) {
  const wrongIndex = (row.answer_index + 1) % row.option_count;
  const makeWrong = WEAK_TOPICS.has(row.topic_id);
  await saveDefaultAssessmentAnswer(assessment.assessmentId, {
    questionId: row.question_id,
    selectedIndex: makeWrong ? wrongIndex : row.answer_index,
    timeTakenMs: 20000,
    confidence: row.topic_id === 'aptitude.fractions' ? 5 : 3,
  });
}

console.log('\nSubmitting produces the initial learner model\n');

const result = await submitDefaultAssessment(assessment.assessmentId, learner);
check('the assessment is now completed', result.status === 'COMPLETED');
check('a score was computed', typeof result.score === 'number' && !Number.isNaN(result.score));
check('the question count round-trips from the database', result.questionCount === assessment.questions.length);
check('a diagnostic was attached', result.diagnostic !== null);

const fractionsReport = result.diagnostic.topics.find((t) => t.topicId === 'aptitude.fractions');
check('fractions reads back as 0% (every answer was wrong)', fractionsReport && fractionsReport.accuracy === 0);
check('fractions is overconfident, not a careless slip (confidence 5, wrong)', fractionsReport.mistakeCounts.OVERCONFIDENT >= 1);
check('fractions is reported as a weak topic', result.diagnostic.weakTopics.includes('aptitude.fractions'));

const dependentWeakGaps = result.diagnostic.prerequisiteGaps.filter((g) => g.prerequisiteTopicId === 'aptitude.fractions');
check(
  'at least one topic that depends on fractions traces its gap back to fractions',
  dependentWeakGaps.length >= 1,
  JSON.stringify(result.diagnostic.prerequisiteGaps)
);

// Phase 4: the same evidence should also produce a sharper classification
// for percentage than plain "weak" — fractions came back at 0%, well below
// the PREREQUISITE_BROKEN_THRESHOLD, so percentage is PREREQUISITE_BLOCKED
// (not merely CRITICAL): its own score can't be trusted until fractions is
// fixed. Either way the recommendation is the same — reinforce fractions,
// not percentage — checked below.
const classificationByTopic = Object.fromEntries(result.diagnostic.classifications.map((c) => [c.topicId, c]));
check('fractions itself classifies as WEAK (no weaker prerequisite beneath it)', classificationByTopic['aptitude.fractions'].classification === 'WEAK');
check(
  'percentage, which depends on the badly broken fractions, classifies as PREREQUISITE_BLOCKED',
  classificationByTopic['aptitude.percentage'].classification === 'PREREQUISITE_BLOCKED',
  classificationByTopic['aptitude.percentage']?.classification
);

const recommendationByTopic = Object.fromEntries(result.diagnostic.recommendations.map((r) => [r.topicId, r]));
check(
  'the recommendation for percentage is to reinforce fractions, not teach percentage',
  recommendationByTopic['aptitude.percentage'].action === 'REINFORCE_PREREQUISITE' &&
    recommendationByTopic['aptitude.percentage'].targetTopicId === 'aptitude.fractions'
);

// Phase 10: the Assessment Diagnostic Engine's exact output contract —
// strengths/weaknesses/prerequisiteGaps/speedIssues/confidenceIssues/
// retentionIssues — assembled from the same evidence, not a second pass.
const { report } = result.diagnostic;
check(
  'the report carries exactly the requested six keys',
  ['strengths', 'weaknesses', 'prerequisiteGaps', 'speedIssues', 'confidenceIssues', 'retentionIssues'].every(
    (k) => Array.isArray(report[k])
  )
);
check('fractions appears in report.weaknesses, not report.strengths', report.weaknesses.some((w) => w.topicId === 'aptitude.fractions'));
check(
  'fractions is flagged as a confidence issue — every wrong answer there was confidence 5',
  report.confidenceIssues.some((c) => c.topicId === 'aptitude.fractions' && c.issueType === 'OVERCONFIDENT')
);
check(
  'report.prerequisiteGaps matches the top-level prerequisiteGaps exactly, not a divergent copy',
  JSON.stringify(report.prerequisiteGaps) === JSON.stringify(result.diagnostic.prerequisiteGaps)
);

// Phase 5: the same diagnosis, walked in real syllabus order, should bend
// into fractions:FOUNDATION+PRACTICE, then stop at the next topic that
// requires fractions in the real seeded graph — which is `decimals` (it
// comes right after fractions in apt.foundation's own chapter order, before
// the path ever reaches percentage) — rather than sailing straight through
// the syllabus the way a learner with no weaknesses would.
const { steps, blocked } = result.diagnostic.learningPath;
const fractionsSteps = steps.filter((s) => s.topicId === 'aptitude.fractions').map((s) => s.type);
check('the path reinforces fractions (foundation, then practice)', JSON.stringify(fractionsSteps) === JSON.stringify(['FOUNDATION', 'PRACTICE']));
check('the path blocks before sailing through the rest of the syllabus', blocked === true);
check('the last step is a FOUNDATION step, not an ADVANCE past an unresolved weakness', steps[steps.length - 1].type === 'FOUNDATION');
check(
  'the path never reaches percentage — it is blocked earlier, by decimals, which also requires fractions',
  !steps.some((s) => s.topicId === 'aptitude.percentage')
);

const { rows: attemptCountRows } = await client.query(
  `SELECT count(*)::int AS n FROM question_attempt WHERE learner_id = $1`,
  [learner]
);
check(
  'answering the assessment wrote real question_attempt rows (same learner model, not a side system)',
  attemptCountRows[0].n === assessment.questions.length
);

console.log('\nResuming after completion reveals the diagnostic; submitting twice is refused\n');

const reloaded = await getDefaultAssessment(assessment.assessmentId);
check('GET after completion reveals the diagnostic', reloaded.diagnostic !== null);
check('GET after completion reveals answer keys', reloaded.questions.every((q) => q.correctIndex !== undefined));

let resubmitRejected = false;
try {
  await submitDefaultAssessment(assessment.assessmentId, learner);
} catch (err) {
  resubmitRejected = err instanceof ValidationError;
}
check('submitting an already-completed assessment is refused', resubmitRejected);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM assessment_answer WHERE assessment_id = $1`, [assessment.assessmentId]);
await client.query(`DELETE FROM assessment_question WHERE assessment_id = $1`, [assessment.assessmentId]);
await client.query(`DELETE FROM assessment WHERE id = $1`, [assessment.assessmentId]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase3-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('default foundation assessment smoke test passed');
