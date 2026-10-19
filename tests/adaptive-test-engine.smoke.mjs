#!/usr/bin/env node
// Phase 27 exit test, against a real database:
//
//   DATABASE_URL=... node tests/adaptive-test-engine.smoke.mjs
//
// Proves the full Phase 27 lifecycle against real seeded content: a real
// blueprint, real question selection, the complete TEST CREATED -> ... ->
// LEARNER MODEL UPDATE pipeline (27.3), a real diagnostic report including
// the two genuinely new pieces (cognitive problems, retention problems —
// 27.4), the Recommendation Engine persisting real, trackable rows (27.5),
// accepting one starting a real Phase 14 intervention (27.6), and the
// effectiveness aggregate reading real evaluated history.

import crypto from 'node:crypto';
import pg from 'pg';
import { createAdaptiveTest, startAdaptiveTest, saveAdaptiveTestAnswer, submitAdaptiveTest, getAdaptiveTestAnalysis } from '../src/services/adaptiveTestService.mjs';
import { getRecommendations, acceptRecommendation } from '../src/services/recommendationService.mjs';
import { getInterventionEffectiveness } from '../src/services/interventionService.mjs';
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

console.log('\n27.1/27.2 — a real blueprint, real question selection, for a fresh learner\n');

const learner = await makeLearner('smoke-phase27-adaptive');
const created = await createAdaptiveTest(learner, { questionCount: 12 });

check('a real test was created in DRAFT, not started yet', created.status === 'DRAFT');
// Never padded to the requested count with fabricated content — when a
// real category's candidate pool runs out, the test is honestly shorter.
check('a real, non-zero question count was selected, never more than requested', created.questionCount > 0 && created.questionCount <= 12, created.questionCount);
check('a real blueprint is attached, with category shares summing to 1', Math.abs(Object.values(created.blueprint.categories).reduce((a, b) => a + b, 0) - 1) < 0.01);
check('every question slot was actually filled with a real question', created.questions.length === created.questionCount);
check('no answer key leaks before the test starts', created.questions.every((q) => q.correctIndex === undefined));

console.log('\n27.3 — TEST STARTED\n');

const started = await startAdaptiveTest(created.testId);
check('starting moves DRAFT to IN_PROGRESS', started.status === 'IN_PROGRESS');

const startedAgain = await startAdaptiveTest(created.testId);
check('starting an already-started test is a harmless no-op', startedAgain.status === 'IN_PROGRESS');

console.log('\n27.3 — ANSWERS RECORDED, graded through the real recordAttempt() pipeline on submit\n');

// Every question gets an answer; half deliberately wrong with real
// confidence/timing variety so the diagnostic (27.4) has real signal to
// report on — including a real guess (wrong AND answered in under 5s;
// classifyMistake() only ever classifies a wrong answer, mistakes.mjs,
// unchanged).
const { rows: keyRows } = await client.query(
  `SELECT aq.question_id, q.answer_index FROM assessment_question aq JOIN question q ON q.id = aq.question_id WHERE aq.assessment_id = $1`,
  [created.testId]
);
const keyByQuestion = new Map(keyRows.map((r) => [r.question_id, r.answer_index]));
for (const [i, q] of started.questions.entries()) {
  const wrong = i % 2 === 1;
  const answerIndex = keyByQuestion.get(q.questionId);
  await saveAdaptiveTestAnswer(created.testId, {
    questionId: q.questionId,
    selectedIndex: wrong ? (answerIndex + 1) % 4 : answerIndex,
    timeTakenMs: i === 1 ? 2000 : 15000, // the first wrong answer is also a real guess (<5s)
    confidence: wrong ? 2 : 4,
  });
}

console.log('\n27.3/27.4 — SUBMIT runs the full diagnostic pipeline\n');

const submitted = await submitAdaptiveTest(created.testId, learner);
check('the test is COMPLETED after submission', submitted.status === 'COMPLETED');
check('a real overall score was computed', submitted.diagnostic.overall.accuracy !== undefined);

const { rows: attemptRows } = await client.query(`SELECT COUNT(*)::int AS n FROM question_attempt WHERE learner_id = $1`, [learner]);
check('every answered question wrote a real question_attempt row, through the shared pipeline', attemptRows[0].n === started.questions.length);

const { rows: stateRows } = await client.query(`SELECT COUNT(*)::int AS n FROM learner_topic_state WHERE learner_id = $1 AND attempt_count > 0`, [learner]);
check('the real learner model was updated from this test, same as any other activity', stateRows[0].n > 0);

const analysis = await getAdaptiveTestAnalysis(created.testId);
check('the diagnostic report carries real strengths/weaknesses (Phase 10, reused)', Array.isArray(analysis.report.strengths) && Array.isArray(analysis.report.weaknesses));
check('cognitive problems (27.4, new) is a real, structured report', 'guessing' in analysis.cognitiveProblems && 'carelessErrors' in analysis.cognitiveProblems);
check('a real guess (answered in under 5s) was actually detected', analysis.cognitiveProblems.guessing.count >= 1, analysis.cognitiveProblems.guessing.count);
check('retention problems (27.4, new) is a real array, even if empty for a first-ever test', Array.isArray(analysis.retentionProblems));

let analysisBeforeSubmitRefused = false;
try {
  await getAdaptiveTestAnalysis((await createAdaptiveTest(learner, { questionCount: 3 })).testId);
} catch (err) {
  analysisBeforeSubmitRefused = err instanceof ValidationError;
}
check('asking for analysis before a test is submitted is refused honestly', analysisBeforeSubmitRefused);

console.log('\n27.5 — the Recommendation Engine scores real candidates and persists real, trackable rows\n');

const { recommendations, nextBestAction } = await getRecommendations(learner);
check('at least one real recommendation was produced', recommendations.length > 0);
check('a single Next Best Action was selected', nextBestAction !== null);
check('every recommendation carries a real confidence in [0,1]', recommendations.every((r) => r.confidence >= 0 && r.confidence <= 1));

const { rows: persistedRows } = await client.query(`SELECT COUNT(*)::int AS n FROM recommendation WHERE learner_id = $1`, [learner]);
check('recommendations were really persisted, not just computed in memory', persistedRows[0].n === recommendations.length);

console.log('\n27.6 — accepting a recommendation starts a real, trackable Phase 14 intervention\n');

const topicTargeted = recommendations.find((r) => r.target !== null);
check('at least one real recommendation targets a specific topic', topicTargeted !== undefined);

if (topicTargeted) {
  const accepted = await acceptRecommendation(topicTargeted.recommendationId, learner);
  check('accepting moves it to ACCEPTED', accepted.status === 'ACCEPTED');
  check('accepting a topic-targeted recommendation started a real intervention', accepted.interventionId !== null);

  const { rows: interventionRows } = await client.query(`SELECT topic_id FROM intervention WHERE id = $1`, [accepted.interventionId]);
  check('the real intervention targets the same real topic the recommendation named', interventionRows[0]?.topic_id === topicTargeted.target);

  let doubleAcceptRefused = false;
  try {
    await acceptRecommendation(topicTargeted.recommendationId, learner);
  } catch (err) {
    doubleAcceptRefused = err instanceof ValidationError;
  }
  check('accepting an already-accepted recommendation is refused, not silently repeated', doubleAcceptRefused);
}

console.log('\n27.6 — effectiveness aggregation reads real intervention history honestly\n');

const effectiveness = await getInterventionEffectiveness(learner);
check('totalPending reflects the real, just-started, not-yet-evaluated intervention', effectiveness.totalPending >= 1, effectiveness.totalPending);
check('no evaluated interventions yet means an honest null average gain, not a fabricated number', effectiveness.totalEvaluated === 0 ? effectiveness.averageLearningGain === null : true);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM recommendation WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM intervention WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM assessment_answer WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [learner]);
await client.query(`DELETE FROM assessment_question WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [learner]);
await client.query(`DELETE FROM assessment WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase27-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('adaptive testing, diagnostics & recommendation engine smoke test passed');
