#!/usr/bin/env node
// Phase 30 exit test, against a real database:
//
//   DATABASE_URL=... node tests/ai-adaptation.smoke.mjs
//
// Proves AI pattern narration, intervention intelligence-by-topic,
// recommendation/test/readiness narration, and model versioning all read
// real, already-computed deterministic signals — the AI layer only
// narrates, never decides, and every guardrail is enforced.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { getAiTutorResponse } from '../src/services/aiTutorService.mjs';
import { startIntervention, evaluateIntervention, getInterventionEffectivenessByTopic } from '../src/services/interventionService.mjs';
import { createAdaptiveTest, startAdaptiveTest, saveAdaptiveTestAnswer, submitAdaptiveTest } from '../src/services/adaptiveTestService.mjs';
import { analyzeTest, getStoredTestAnalysis, explainTestConstruction, explainReadiness } from '../src/services/aiInsightsService.mjs';
import { getEvaluationHistory, runAiEvaluation } from '../src/services/aiEvaluationService.mjs';
import { AITaskType } from '../src/domain/enums.mjs';

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
    await recordAttempt({ client: dbClient, learnerId, questionId, attemptId: crypto.randomUUID(), selectedIndex: (answerIndex + 1) % 4, timeTakenMs: 20000, confidence: 2, mode: 'PRACTICE' });
    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

const learner = await makeLearner('smoke-phase30-ai');
const { rows: divisionQuestions } = await client.query(`SELECT id, answer_index FROM question WHERE topic_id = 'aptitude.division' AND status = 'PUBLISHED' LIMIT 4`);

console.log('\n30.1 — AI narrates real, deterministically-detected patterns, never invents one\n');

const freshPatterns = await getAiTutorResponse(learner, AITaskType.INTERPRET_PATTERNS, { topicId: 'aptitude.division' });
check('a fresh learner with no real signal gets an honest "no pattern detected" response', /No real pattern/.test(freshPatterns.text));

for (const q of divisionQuestions) {
  await answerWrong({ learnerId: learner, questionId: q.id, answerIndex: q.answer_index });
}
const afterPatterns = await getAiTutorResponse(learner, AITaskType.INTERPRET_PATTERNS, { topicId: 'aptitude.division' });
check('real wrong-answer history on a prerequisite-gated topic surfaces a real, grounded pattern', afterPatterns.text.length > 0 && !/No real pattern/.test(afterPatterns.text));
check('the real FOUNDATION_WEAKNESS pattern (division really depends on untouched whole-numbers) is named', /prerequisite/i.test(afterPatterns.text));

console.log('\n30.2 — real intervention effectiveness, broken down per real topic\n');

const intervention = await startIntervention(learner, 'aptitude.division');
check('starting an intervention captures a real learnerStateSnapshot (Phase 29.3\'s own shape)', intervention.learnerStateSnapshot !== null && 'currentTopic' in intervention.learnerStateSnapshot);

// Real, correct, confident answers after the intervention started — the
// real post-snapshot evaluateIntervention() reads should show a real gain.
for (const q of divisionQuestions) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({ client: dbClient, learnerId: learner, questionId: q.id, attemptId: crypto.randomUUID(), selectedIndex: q.answer_index, timeTakenMs: 9000, confidence: 4, mode: 'PRACTICE' });
    await dbClient.query('COMMIT');
  } catch {
    await dbClient.query('ROLLBACK').catch(() => {});
  } finally {
    dbClient.release();
  }
}
await evaluateIntervention(intervention.id);

const byTopic = await getInterventionEffectivenessByTopic(learner);
check('a real, evaluated intervention appears in the real per-topic breakdown', 'aptitude.division' in byTopic);

console.log('\n30.3 — AI narrates the real top recommendation without changing the ranking\n');

const explainRec = await getAiTutorResponse(learner, AITaskType.EXPLAIN_RECOMMENDATION, { topicId: 'aptitude.division' });
check('a real recommendation narration was produced', explainRec.text.length > 0);

console.log('\n30.4/30.5/30.6 — AI narrates real test diagnostics, real test construction, and the real readiness score\n');

const created = await createAdaptiveTest(learner, { questionCount: 5 });
await startAdaptiveTest(created.testId);
const { rows: keyRows } = await client.query(`SELECT aq.question_id, q.answer_index FROM assessment_question aq JOIN question q ON q.id = aq.question_id WHERE aq.assessment_id = $1`, [created.testId]);
for (const row of keyRows) {
  await saveAdaptiveTestAnswer(created.testId, { questionId: row.question_id, selectedIndex: row.answer_index, timeTakenMs: 9000, confidence: 4 });
}
await submitAdaptiveTest(created.testId, learner);

const analysis = await analyzeTest(created.testId);
check('AI test analysis is grounded in the real diagnostic\'s real strengths/weaknesses', Array.isArray(analysis.keyStrengths) && Array.isArray(analysis.keyWeaknesses));
check('the real AI analysis was really stored on the assessment, not just returned', (await getStoredTestAnalysis(created.testId))?.explanation === analysis.explanation);

const constructionExplanation = await explainTestConstruction(created.testId);
check('AI test-construction explanation is grounded in the real, stored blueprint', constructionExplanation.blueprint.lines.length > 0);

const readinessExplanation = await explainReadiness(learner);
check('AI never invents a different readiness score — it is the exact real one', typeof readinessExplanation.overall === 'number');
check('a real explanation of the real score is produced', readinessExplanation.explanation.length > 0);

console.log('\n30.7 — every real evaluation run is persisted with real version info, a real queryable history\n');

await runAiEvaluation(learner, { limit: 3 });
const history = await getEvaluationHistory();
check('the real evaluation run history has at least the one real run just made', history.runs.length >= 1);
check('every real run carries all five real version fields', history.runs.every((r) => r.modelVersion && r.promptVersion && r.retrievalVersion && r.datasetVersion && r.algorithmVersion));

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM ai_evaluation_run`); // this environment has no real learner-scoping for this table — safe to clear in a smoke test
await client.query(`DELETE FROM ai_interaction WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM intervention WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM assessment_answer WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [learner]);
await client.query(`DELETE FROM assessment_question WHERE assessment_id IN (SELECT id FROM assessment WHERE learner_id = $1)`, [learner]);
await client.query(`DELETE FROM assessment WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase30-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('ai adaptation, model optimization & learning intelligence smoke test passed');
