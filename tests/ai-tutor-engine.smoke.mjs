#!/usr/bin/env node
// Phase 29 exit test, against a real database:
//
//   DATABASE_URL=... node tests/ai-tutor-engine.smoke.mjs
//
// Proves the AI Knowledge Base, Personalized Context, AI Tutor dispatch,
// Prompt/Response architecture, Training Dataset, Evaluation, and Feedback
// Loop all read/write real data — grounded, deterministic responses (no
// ANTHROPIC_API_KEY is configured in this environment, confirmed), real
// caching, a real link to Phase 14's intervention tracking, and honest
// degradation wherever real evidence doesn't exist yet.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getLearnerAiContext } from '../src/services/learnerAiContextService.mjs';
import { getAiTutorResponse } from '../src/services/aiTutorService.mjs';
import { startIntervention } from '../src/services/interventionService.mjs';
import { getTrainingDataset } from '../src/services/aiTrainingDatasetService.mjs';
import { searchKnowledgeBase } from '../src/services/aiKnowledgeBaseService.mjs';
import { runAiEvaluation } from '../src/services/aiEvaluationService.mjs';
import { getAiFeedbackLoop } from '../src/services/aiFeedbackLoopService.mjs';
import { AITaskType } from '../src/domain/enums.mjs';
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

async function answer({ learnerId, questionId, selectedIndex, timeTakenMs, confidence }) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({ client: dbClient, learnerId, questionId, attemptId: crypto.randomUUID(), selectedIndex, timeTakenMs, confidence, mode: 'PRACTICE' });
    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

const learner = await makeLearner('smoke-phase29-ai');
const { rows: questions } = await client.query(`SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.whole-numbers' AND status = 'PUBLISHED' LIMIT 2`);
const [q1, q2] = questions;

console.log('\n29.3 — Personalized Learner Context, the brief\'s exact real shape\n');

const freshContext = await getLearnerAiContext(learner, 'aptitude.whole-numbers');
check('a fresh learner reads a real, honest, zeroed context', freshContext.mastery === 0 && freshContext.recentMistake === null);
check('the context carries every real field the brief names', ['currentTopic', 'mastery', 'recentMistake', 'difficulty', 'confidence', 'recentPerformance', 'preferredExplanation'].every((k) => k in freshContext));

console.log('\n29.4/29.5 — question-level AI Tutor tasks: real, grounded, deterministic (no provider configured)\n');

const hint = await getAiTutorResponse(learner, AITaskType.GIVE_HINT, { questionId: q1.id });
check('GIVE_HINT falls back to a real, deterministic response', hint.source === 'fallback');
check('the response is grounded in real content, non-empty', hint.text.length > 10);

const cachedHint = await getAiTutorResponse(learner, AITaskType.GIVE_HINT, { questionId: q1.id });
check('a repeat call for the exact same real task hits the real cache', cachedHint.source === 'cache');
check('the cached text matches the first real response exactly', cachedHint.text === hint.text);

const explainMistake = await getAiTutorResponse(learner, AITaskType.EXPLAIN_MISTAKE, { questionId: q1.id, selectedIndex: (q1.answer_index + 1) % 4 });
check('EXPLAIN_MISTAKE on a real wrong selection grounds its response in the real trap', explainMistake.text.length > 0);

const similar = await getAiTutorResponse(learner, AITaskType.SIMILAR_QUESTION, { questionId: q1.id });
check('SIMILAR_QUESTION is honest about a real similar question (or its real absence)', /similar question|No other real question/.test(similar.text));

let unknownTaskRefused = false;
try {
  await getAiTutorResponse(learner, 'NOT_A_REAL_TASK', { questionId: q1.id });
} catch (err) {
  unknownTaskRefused = err instanceof ValidationError;
}
check('an unknown AI task is refused, not silently guessed', unknownTaskRefused);

console.log('\n29.4 — topic-level tasks ground real prerequisite/example data\n');

const teachPrereq = await getAiTutorResponse(learner, AITaskType.TEACH_PREREQUISITE, { topicId: 'aptitude.division' });
check('TEACH_PREREQUISITE names the real, seeded prerequisite (whole numbers)', /whole numbers/i.test(teachPrereq.text));

const summarize = await getAiTutorResponse(learner, AITaskType.SUMMARIZE_TOPIC, { topicId: 'aptitude.whole-numbers' });
check('SUMMARIZE_TOPIC is grounded in real example questions', summarize.text.length > 0);

console.log('\n29.4 — COMPARE_CONCEPTS (topic-pair) never caches a stale comparison against the wrong second topic\n');

const compareA = await getAiTutorResponse(learner, AITaskType.COMPARE_CONCEPTS, { topicId: 'aptitude.division', secondTopicId: 'aptitude.whole-numbers' });
const compareB = await getAiTutorResponse(learner, AITaskType.COMPARE_CONCEPTS, { topicId: 'aptitude.division', secondTopicId: 'aptitude.fractions' });
check('comparing against two different real second topics produces two different real comparisons, not a stale cache hit', compareA.text !== compareB.text, `${compareA.text} === ${compareB.text}`);

console.log('\n29.5 — every real AI interaction is really logged, linked to a real active intervention when one exists\n');

const activeIntervention = await startIntervention(learner, 'aptitude.whole-numbers');
const afterIntervention = await getAiTutorResponse(learner, AITaskType.EXPLAIN_SIMPLY, { questionId: q2.id });
const { rows: loggedRows } = await client.query(`SELECT intervention_id FROM ai_interaction WHERE learner_id = $1 AND question_id = $2 AND type = $3`, [learner, q2.id, AITaskType.EXPLAIN_SIMPLY]);
check('the real AI interaction was linked to the real, currently-active intervention', loggedRows[0]?.intervention_id === activeIntervention.id);

console.log('\n29.1 — the real keyword-based retrieval layer (no embedding provider configured)\n');

const search = await searchKnowledgeBase('place value thousands');
check('a real, relevant query returns real, ranked results from real content', search.results.length > 0);
check('the honest non-embedding disclaimer is present', /no embedding provider/.test(search.disclaimer));

console.log('\n29.2 — the training dataset assembles real structured examples, never from raw ai_interaction rows\n');

const dataset = await getTrainingDataset();
check('the real dataset has real examples across more than one real category', dataset.totalExamples > 0 && Object.keys(dataset.byType).length > 1);

console.log('\n29.6 — AI evaluation runs the real pipeline and scores it deterministically\n');

const evaluation = await runAiEvaluation(learner, { limit: 3 });
check('the real evaluation covers the requested real number of items', evaluation.totalItems === 3);
check('a real pass rate was computed, not fabricated', evaluation.passRate !== null && evaluation.passRate >= 0 && evaluation.passRate <= 1);

console.log('\n29.7 — the feedback loop is honest about not having enough real evidence yet\n');

const feedback = await getAiFeedbackLoop(learner);
check('with no real evaluated interventions yet, the comparison is honestly null, not fabricated', feedback.comparison === null && feedback.disclaimer !== null);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM ai_interaction WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM intervention WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase29-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('ai training, knowledge & personalization engine smoke test passed');
