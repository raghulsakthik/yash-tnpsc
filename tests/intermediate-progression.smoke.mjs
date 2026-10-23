#!/usr/bin/env node
// Phase 18 exit test, against a real database:
//
//   DATABASE_URL=... node tests/intermediate-progression.smoke.mjs
//
// Proves the tier is a real progression state, not a hardcoded date: a
// learner who has practiced hard but never been independently assessed
// stays at FOUNDATION tier — intermediate topics (real ones: compound
// interest, volume, the reasoning topics) stay excluded from her candidate
// pool — and only flips to INTERMEDIATE once a real, completed Phase 3
// Default Foundation Test confirms every foundation topic, exactly
// mirroring Phase 13's MASTERED/RETAINED gate semantics.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import {
  checkDefaultAssessmentEligibility,
  startDefaultAssessment,
  saveDefaultAssessmentAnswer,
  submitDefaultAssessment,
} from '../src/services/defaultAssessmentService.mjs';
import { getProgressionTier, getCandidatePool, getExpandedNextAction } from '../src/services/intermediateProgressionService.mjs';

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

const FOUNDATION_TOPICS = ['aptitude.whole-numbers', 'aptitude.division', 'aptitude.fractions', 'aptitude.decimals'];

console.log('\nA fresh learner is FOUNDATION tier, with a foundation-only candidate pool\n');

const learner = await makeLearner('smoke-phase18-progression');
const freshTier = await getProgressionTier(learner);
check('a fresh learner is FOUNDATION tier', freshTier.tier === 'FOUNDATION');
check('all 4 real foundation topics are reported, none ready', freshTier.foundationTopics.length === 4 && freshTier.foundationTopics.every((t) => !t.ready));

const freshPool = await getCandidatePool(learner);
check('the fresh candidate pool excludes real intermediate topics (e.g. volume, reasoning)', !freshPool.topicIds.includes('aptitude.volume'));

console.log('\nHeavy practice alone (no independent assessment) does not flip the tier\n');

for (const topicId of FOUNDATION_TOPICS) {
  const { rows: questions } = await client.query(
    `SELECT id, answer_index FROM question WHERE topic_id = $1 AND status = 'PUBLISHED' LIMIT 8`,
    [topicId]
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
}

const practicedTier = await getProgressionTier(learner);
check(
  'strong practice alone keeps every foundation topic at NEAR_MASTERY, tier still FOUNDATION',
  practicedTier.tier === 'FOUNDATION' && practicedTier.foundationTopics.every((t) => t.status === 'NEAR_MASTERY'),
  JSON.stringify(practicedTier.foundationTopics.map((t) => t.status))
);

console.log('\nA real, completed Default Foundation Test confirms all four — the tier flips\n');

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
check('eligible for the Default Foundation Test', eligibility.eligible);

const assessment = await startDefaultAssessment(learner);
const { rows: keyRows } = await client.query(
  `SELECT aq.question_id, q.answer_index FROM assessment_question aq JOIN question q ON q.id = aq.question_id WHERE aq.assessment_id = $1`,
  [assessment.assessmentId]
);
for (const row of keyRows) {
  await saveDefaultAssessmentAnswer(assessment.assessmentId, {
    questionId: row.question_id,
    selectedIndex: row.answer_index, // every answer correct — a clean, confirming assessment
    timeTakenMs: 10000,
    confidence: 4,
  });
}
await submitDefaultAssessment(assessment.assessmentId, learner);

const confirmedTier = await getProgressionTier(learner);
check(
  'all 4 foundation topics now read MASTERED or RETAINED',
  confirmedTier.foundationTopics.every((t) => t.status === 'MASTERED' || t.status === 'RETAINED'),
  JSON.stringify(confirmedTier.foundationTopics.map((t) => t.status))
);
check('the tier has flipped to INTERMEDIATE', confirmedTier.tier === 'INTERMEDIATE');

const expandedPool = await getCandidatePool(learner);
check('the candidate pool now includes a real intermediate topic (volume)', expandedPool.topicIds.includes('aptitude.volume'));
check('the pool is strictly larger than the foundation-only pool', expandedPool.topicIds.length > freshPool.topicIds.length);

const nextAction = await getExpandedNextAction(learner);
check('the expanded next-action call succeeds and reports the INTERMEDIATE tier', nextAction.tier === 'INTERMEDIATE');

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM assessment_answer WHERE assessment_id = $1`, [assessment.assessmentId]);
await client.query(`DELETE FROM assessment_question WHERE assessment_id = $1`, [assessment.assessmentId]);
await client.query(`DELETE FROM assessment WHERE id = $1`, [assessment.assessmentId]);
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase18-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('intermediate progression engine smoke test passed');
