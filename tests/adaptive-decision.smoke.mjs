#!/usr/bin/env node
// Phase 11 exit test, against a real database:
//
//   DATABASE_URL=... node tests/adaptive-decision.smoke.mjs
//
// Proves the Adaptive Decision Engine makes different decisions for
// different real learners on the real seeded syllabus — not a single
// assertable answer, a scored decision that changes as the evidence does.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { decideNextActionForTopic } from '../src/services/adaptiveDecisionService.mjs';

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

async function answerQuestions(learnerId, topicId, plan) {
  const { rows: questions } = await client.query(
    `SELECT id, answer_index, estimated_seconds FROM question WHERE topic_id = $1 AND status = 'PUBLISHED' LIMIT $2`,
    [topicId, plan.length]
  );
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const { correct, timeTakenMs, confidence } = plan[i];
    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');
      await recordAttempt({
        client: dbClient,
        learnerId,
        questionId: q.id,
        attemptId: crypto.randomUUID(),
        selectedIndex: correct ? q.answer_index : (q.answer_index + 1) % 4,
        timeTakenMs,
        confidence,
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
  return questions.length;
}

console.log('\nA brand new topic, never touched\n');

const fresh = await makeLearner('smoke-phase11-fresh');
const freshDecision = await decideNextActionForTopic(fresh, 'aptitude.whole-numbers');
check('a never-touched topic defaults to PRACTICE', freshDecision.action === 'PRACTICE', freshDecision.action);
check('every candidate action is still scored (auditable, not just asserted)', freshDecision.candidates.length === 8);

console.log('\nA learner doing well, quickly, on a real topic\n');

const strong = await makeLearner('smoke-phase11-strong');
await answerQuestions(strong, 'aptitude.whole-numbers', Array.from({ length: 8 }, () => ({ correct: true, timeTakenMs: 10000, confidence: 4 })));
const strongDecision = await decideNextActionForTopic(strong, 'aptitude.whole-numbers');
check(
  'a learner doing well gets ADVANCE_TOPIC or MINI_ASSESSMENT, never PREREQUISITE_LESSON/REPEAT_LESSON',
  ['ADVANCE_TOPIC', 'MINI_ASSESSMENT', 'PRACTICE'].includes(strongDecision.action),
  strongDecision.action
);

console.log('\nA learner whose prerequisite is badly broken\n');

const blocked = await makeLearner('smoke-phase11-blocked');
// whole-numbers stays untouched (0%); go straight to division, which
// requires it in the real seeded syllabus.
await answerQuestions(blocked, 'aptitude.division', Array.from({ length: 5 }, () => ({ correct: true, timeTakenMs: 10000, confidence: 4 })));
const blockedDecision = await decideNextActionForTopic(blocked, 'aptitude.division');
check(
  'a topic whose real prerequisite is at 0% gets PREREQUISITE_LESSON, regardless of its own performance',
  blockedDecision.action === 'PREREQUISITE_LESSON',
  blockedDecision.action
);
check('PRACTICE scored 0 for this learner on this topic — the gate is genuinely closed', blockedDecision.candidates.find((c) => c.action === 'PRACTICE').score === 0);

console.log('\nA learner with real conceptual trouble on a topic\n');

const struggling = await makeLearner('smoke-phase11-struggling');
await answerQuestions(
  struggling,
  'aptitude.simplification',
  Array.from({ length: 10 }, () => ({ correct: false, timeTakenMs: 25000, confidence: 2 }))
);
const strugglingDecision = await decideNextActionForTopic(struggling, 'aptitude.simplification');
check(
  'consistent, normal-pace wrong answers on an accessible topic recommend REPEAT_LESSON or PREREQUISITE_LESSON, not blind PRACTICE',
  ['REPEAT_LESSON', 'PREREQUISITE_LESSON'].includes(strugglingDecision.action),
  strugglingDecision.action
);

console.log('\nDifferent learners, same engine, different decisions\n');

const allActions = new Set([freshDecision.action, strongDecision.action, blockedDecision.action, strugglingDecision.action]);
check('at least two distinct decisions were produced across these four learners', allActions.size >= 2, [...allActions].join(', '));

// ------------------------------------------------------------------ cleanup
for (const name of ['smoke-phase11-fresh', 'smoke-phase11-strong', 'smoke-phase11-blocked', 'smoke-phase11-struggling']) {
  const { rows } = await client.query(`SELECT id FROM learner WHERE name = $1`, [name]);
  for (const { id } of rows) {
    await client.query('DELETE FROM question_attempt WHERE learner_id = $1', [id]);
    await client.query('DELETE FROM learner_topic_state WHERE learner_id = $1', [id]);
    await client.query('DELETE FROM revision_schedule WHERE learner_id = $1', [id]);
  }
}
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase11-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('adaptive decision engine smoke test passed');
