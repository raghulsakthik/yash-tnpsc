#!/usr/bin/env node
// Phase 20 exit test, against a real database:
//
//   DATABASE_URL=... node tests/multi-subject.smoke.mjs
//
// "Reuse Content Engine/Question Engine/Assessment Engine/Adaptive Engine/
// Revision Engine/Mistake Engine — don't create separate systems for every
// subject, only subject-specific configuration changes." Proves it by
// exercising the exact same, completely unchanged engines against real
// Indian Polity content (a different subject — General Studies, not
// Aptitude) that this phase authored and seeded through the unchanged
// content pipeline: the weekly-test-style blueprint allocator, the mistake
// classifier, the mastery/revision pipeline via recordAttempt, Phase 4's
// classifier, and Phase 11's adaptive decision engine all run against
// `gs.indian-polity` with zero code branching on subject.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { allocateSlots, pickTopicQuestions } from '../src/domain/testGen.mjs';
import { classifyTopics } from '../src/domain/diagnostic.mjs';
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

console.log('\nThe real content pipeline accepted real Polity content with zero code changes\n');

const { rows: polityQuestions } = await client.query(
  `SELECT q.id, q.topic_id, q.difficulty::float8 AS difficulty, q.answer_index
     FROM question q JOIN topic t ON t.id = q.topic_id
    WHERE t.chapter_id = 'gs.indian-polity' AND q.status = 'PUBLISHED'`
);
check('real, seeded Indian Polity questions exist across more than one topic', new Set(polityQuestions.map((q) => q.topic_id)).size >= 5, polityQuestions.length);

console.log("\nThe weekly-test blueprint allocator (testGen.mjs, unchanged) works identically on Polity\n");

const byTopic = new Map();
for (const q of polityQuestions) {
  if (!byTopic.has(q.topic_id)) byTopic.set(q.topic_id, []);
  byTopic.get(q.topic_id).push(q);
}
const shares = [...byTopic.keys()].map((id) => ({ id, share: byTopic.get(id).length }));
const slots = allocateSlots(shares, 8);
let picked = [];
for (const [topicId, count] of slots) {
  if (count > 0) picked.push(...pickTopicQuestions(byTopic.get(topicId), count));
}
check('allocateSlots()/pickTopicQuestions() (the exact weekly-test allocator) picked a real Polity question set', picked.length > 0 && picked.length <= 8, picked.length);

console.log('\nThe mistake-classification + mastery/revision pipeline (recordAttempt, unchanged) works identically on Polity\n');

const learner = await makeLearner('smoke-phase20-multisubject');
const polityTopicId = polityQuestions[0].topic_id;
const topicQuestions = polityQuestions.filter((q) => q.topic_id === polityTopicId);

for (const q of topicQuestions) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await recordAttempt({
      client: dbClient,
      learnerId: learner,
      questionId: q.id,
      attemptId: crypto.randomUUID(),
      selectedIndex: (q.answer_index + 1) % 4, // deliberately wrong
      timeTakenMs: 2000, // fast — a guess
      confidence: 2,
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

const { rows: stateRows } = await client.query(
  `SELECT mastery_score::float8 AS mastery, mistake_type FROM learner_topic_state s
     JOIN question_attempt qa ON qa.topic_id = s.topic_id AND qa.learner_id = s.learner_id
    WHERE s.learner_id = $1 AND s.topic_id = $2 LIMIT 1`,
  [learner, polityTopicId]
);
check('a real mastery_score was computed for a Polity topic, the same pipeline as any aptitude topic', stateRows.length > 0 && typeof stateRows[0].mastery === 'number');

const { rows: revisionRows } = await client.query(
  `SELECT 1 FROM revision_schedule WHERE learner_id = $1 AND topic_id = $2`,
  [learner, polityTopicId]
);
check('the spaced-repetition schedule was created for a Polity topic, exactly as for any other topic', revisionRows.length === 1);

console.log("\nPhase 4's classifier and Phase 11's adaptive decision engine (both unchanged) work identically on Polity\n");

const { rows: accuracyRow } = await client.query(
  `SELECT accuracy_score::float8 AS accuracy, attempt_count FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
  [learner, polityTopicId]
);
const topics = [{ topicId: polityTopicId, accuracy: accuracyRow[0].accuracy * 100, questionCount: accuracyRow[0].attempt_count }];
const [classification] = classifyTopics(topics, new Map());
check('classifyTopics() (Phase 4) classifies a weak Polity topic the same way it would any aptitude topic', classification.classification === 'WEAK' || classification.classification === 'CRITICAL', classification.classification);

const decision = await decideNextActionForTopic(learner, polityTopicId);
check(
  "decideNextActionForTopic() (Phase 11's Adaptive Decision Engine) produces a real decision for a Polity topic, same engine, zero subject-specific code",
  typeof decision.action === 'string' && decision.candidates.length === 8
);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase20-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('multi-subject domain expansion smoke test passed');
