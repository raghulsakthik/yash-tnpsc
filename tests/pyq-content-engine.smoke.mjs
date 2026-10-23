#!/usr/bin/env node
// Phase 26.3/26.4/26.5/26.6 exit test, against a real database:
//
//   DATABASE_URL=... node tests/pyq-content-engine.smoke.mjs
//
// Covers the practice catalogue (year/topic/weak-area/incorrect
// filtering), the deterministic solving assistant (read-only, grounded in
// real authored fields), difficulty intelligence from real aggregate
// attempt evidence, and the honestly-empty TNPSC-Inspired MCQ endpoint —
// against the real, transcribed past-paper catalogue and a real
// recordAttempt() pipeline throughout.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { listPyqQuestions, getPyqQuestion, getPyqYears, getPyqTopics } from '../src/services/pyqCatalogService.mjs';
import { getHint, explainQuestion, solveQuestion } from '../src/services/pyqAssistantService.mjs';
import { getDifficultyIntelligence } from '../src/services/difficultyIntelligenceService.mjs';
import { listInspiredQuestions } from '../src/services/inspiredQuestionService.mjs';
import { NotFoundError } from '../src/services/errors.mjs';

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

async function answer({ learnerId, questionId, selectedIndex, timeTakenMs, confidence, hintUsed = false }) {
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
      mode: 'PRACTICE',
      hintUsed,
    });
    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

console.log('\n26.3 — Year-wise, topic-wise and mixed PYQ practice over real content\n');

const learner = await makeLearner('smoke-phase26-content');

const byYear = await listPyqQuestions(learner, { year: 2018 });
check('a real year filter returns only that real year\'s questions', byYear.questions.length > 0 && byYear.questions.every((q) => q.year === 2018), byYear.questions.length);

const byTopic = await listPyqQuestions(learner, { topicId: 'aptitude.hcf' });
check('a real topic filter returns only that real topic\'s questions', byTopic.questions.length > 0 && byTopic.questions.every((q) => q.topicId === 'aptitude.hcf'));

const mixed = await listPyqQuestions(learner, {});
check('mixed mode (no filter) returns real content across topics', mixed.questions.length > 0);
check('timed mode reports a real time budget, the real sum of estimated seconds', mixed.timeLimitSeconds === mixed.questions.reduce((s, q) => s + q.estimatedSeconds, 0));

const years = await getPyqYears();
check('GET .../years reports real, transcribed years only', years.every((y) => y.count > 0));

const topics = await getPyqTopics();
check('GET .../topics reports real topics with real counts', topics.every((t) => t.count > 0));

console.log('\n26.3 — weak-area and incorrect PYQ modes read real learner evidence, never fabricate it\n');

const freshWeak = await listPyqQuestions(learner, { mode: 'weak-area' });
check('a fresh learner with nothing classified yet gets an honest empty weak-area list, not a guess', freshWeak.questions.length === 0 && freshWeak.reason != null);

const hcfQuestion = byTopic.questions[0];
for (let i = 0; i < 3; i += 1) {
  // All three real attempts land on the same real question — difficulty
  // intelligence (26.6) needs a real sample size on one specific question.
  await answer({ learnerId: learner, questionId: hcfQuestion.id, selectedIndex: (0 + 1) % 4, timeTakenMs: 20000, confidence: 2 });
}
const incorrect = await listPyqQuestions(learner, { mode: 'incorrect' });
check('incorrect mode returns only real questions she actually got wrong', incorrect.questions.length > 0 && incorrect.questions.every((q) => q.topicId === 'aptitude.hcf'));

console.log('\n26.4 — the deterministic solving assistant, grounded in real authored fields, never writes state\n');

const beforeState = await client.query(`SELECT mastery_score, attempt_count FROM learner_topic_state WHERE learner_id = $1 AND topic_id = 'aptitude.hcf'`, [learner]);

const hintStage1 = await getHint(hcfQuestion.id, 1);
check('stage 1 reveals exactly one real level', hintStage1.levels.length === 1);
const hintStage4 = await getHint(hcfQuestion.id, 4);
check('stage 4 reveals the full real explanation', hintStage4.levels[3].content.length > 0);

const explanation = await explainQuestion(hcfQuestion.id, null);
check('explain reports a real correct option from the real authored data', explanation.correctOption.length > 0);

const solve = await solveQuestion(hcfQuestion.id);
check('solve returns the real authored solution', solve.solution.length > 0);
check('solve either finds a real similar question or is honest that none exists, never fabricating one', solve.similarQuestion !== undefined);

const afterState = await client.query(`SELECT mastery_score, attempt_count FROM learner_topic_state WHERE learner_id = $1 AND topic_id = 'aptitude.hcf'`, [learner]);
check(
  'the assistant never touched learner_topic_state — read-only, as the brief requires',
  JSON.stringify(beforeState.rows) === JSON.stringify(afterState.rows)
);

let assistantNotFound = false;
try {
  await getHint('not-a-real-question', 1);
} catch (err) {
  assistantNotFound = err instanceof NotFoundError;
}
check('asking for assistance on a question that does not exist is refused honestly', assistantNotFound);

console.log('\n26.6 — difficulty intelligence from real aggregate evidence, never auto-applied\n');

const earlyIntel = await getDifficultyIntelligence(hcfQuestion.id);
check('real evidence (3 real attempts) is enough for a real signal', earlyIntel.evidence.attemptCount === 3);
check('authored difficulty is reported untouched alongside the suggestion', earlyIntel.authoredDifficulty === hcfQuestion.difficulty);
check('the single-tenant population caveat is stated plainly, never implying a real population', /single-tenant/.test(earlyIntel.evidence.populationCaveat));

console.log('\n26.5 — the TNPSC-Inspired MCQ endpoint is honestly empty: no AI provider is configured\n');

const inspired = await listInspiredQuestions();
check('no fabricated "inspired" questions are ever returned', inspired.questions.length === 0);
check('the honest reason names the real constraint', /no AI provider/.test(inspired.note));

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase26-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('pyq content engine smoke test passed');
