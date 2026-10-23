#!/usr/bin/env node
// Phase 19 exit test, against a real database:
//
//   DATABASE_URL=... node tests/aptitude-assessment.smoke.mjs
//
// Proves the Aptitude Assessment Layer's analysis step against a real,
// completed weekly test — generated/answered/submitted the same way
// tests/loop.smoke.mjs already proves the weekly test itself works (no
// service layer exists for it to call directly; this mirrors that exact,
// already-established pattern rather than inventing a new one) — then
// shows the richer diagnostic (Phase 3/4/10) and a concrete adaptive
// intervention per weak topic (Phase 11), all reused unchanged.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { allocateSlots, pickTopicQuestions } from '../src/domain/testGen.mjs';
import { analyzeAptitudeAssessment } from '../src/services/aptitudeAssessmentService.mjs';

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

console.log('\nGenerating, answering, and submitting a real weekly test\n');

const learner = await makeLearner('smoke-phase19-aptitude');

const { rows: chapterTopics } = await client.query(
  `SELECT c.id AS chapter_id, c.question_count, t.id AS topic_id, t.name AS topic_name
     FROM chapter c JOIN topic t ON t.chapter_id = c.id
    WHERE c.id IN ('apt.aptitude', 'apt.reasoning')`
);
const { rows: bankRows } = await client.query(
  `SELECT topic_id, id, difficulty::float8 AS difficulty, answer_index FROM question WHERE status = 'PUBLISHED'`
);

const topicsByChapter = new Map();
for (const row of chapterTopics) {
  if (!topicsByChapter.has(row.chapter_id)) topicsByChapter.set(row.chapter_id, []);
  topicsByChapter.get(row.chapter_id).push(row);
}
const shares = [];
const topicIds = new Set();
for (const [, topics] of topicsByChapter) {
  const share = topics[0].question_count / topics.length;
  for (const t of topics) {
    shares.push({ id: t.topic_id, share });
    topicIds.add(t.topic_id);
  }
}
const questionsByTopic = new Map();
for (const q of bankRows) {
  if (!topicIds.has(q.topic_id)) continue;
  if (!questionsByTopic.has(q.topic_id)) questionsByTopic.set(q.topic_id, []);
  questionsByTopic.get(q.topic_id).push(q);
}
const availableShares = shares.filter((s) => (questionsByTopic.get(s.id) ?? []).length > 0);
const slots = allocateSlots(availableShares, 25);

let picked = [];
for (const [topicId, count] of slots) {
  if (count > 0) picked.push(...pickTopicQuestions(questionsByTopic.get(topicId) ?? [], count));
}
check('a 25-question test was generated', picked.length === 25, `(${picked.length})`);

const { rows: testRows } = await client.query(
  `INSERT INTO test (learner_id, question_count) VALUES ($1, $2) RETURNING id`,
  [learner, picked.length]
);
const testId = testRows[0].id;
for (const [index, q] of picked.entries()) {
  await client.query(`INSERT INTO test_question (test_id, question_id, order_index) VALUES ($1, $2, $3)`, [testId, q.id, index]);
}

// Every question on one real topic is deliberately wrong and slow relative
// to its *own* estimated_seconds (every topic has a different baseline, so
// this is scaled per-question rather than a fixed millisecond guess) —
// everything else right and on pace — so the diagnostic and adaptive
// intervention have something real to find.
const { rows: estimatedSecondsRows } = await client.query(
  `SELECT id, estimated_seconds FROM question WHERE id = ANY($1)`,
  [picked.map((q) => q.id)]
);
const estimatedSecondsById = new Map(estimatedSecondsRows.map((r) => [r.id, r.estimated_seconds]));

const weakTopicId = picked[0].topic_id;
for (const q of picked) {
  const makeWrong = q.topic_id === weakTopicId;
  const selectedIndex = makeWrong ? (q.answer_index + 1) % 4 : q.answer_index;
  const expectedMs = estimatedSecondsById.get(q.id) * 1000;
  const timeTakenMs = makeWrong ? Math.round(expectedMs * 2.5) : Math.round(expectedMs * 0.8);
  await client.query(
    `INSERT INTO test_answer (test_id, question_id, selected_index, time_taken_ms) VALUES ($1, $2, $3, $4)`,
    [testId, q.id, selectedIndex, timeTakenMs]
  );
}

await client.query('BEGIN');
let correctCount = 0;
for (const q of picked) {
  const { rows: ansRows } = await client.query(
    `SELECT selected_index, time_taken_ms FROM test_answer WHERE test_id = $1 AND question_id = $2`,
    [testId, q.id]
  );
  const answer = ansRows[0];
  const result = await recordAttempt({
    client,
    learnerId: learner,
    questionId: q.id,
    attemptId: crypto.randomUUID(),
    selectedIndex: answer.selected_index,
    timeTakenMs: answer.time_taken_ms,
    confidence: null,
    mode: 'TEST',
  });
  if (result.correct) correctCount += 1;
}
const score = (correctCount / picked.length) * 100;
await client.query(`UPDATE test SET status = 'COMPLETED', completed_at = now(), score = $1 WHERE id = $2`, [score.toFixed(2), testId]);
await client.query('COMMIT');

check('the weekly test is a real, completed test with a real score', score < 100 && score > 0, score);

console.log('\nAnalyzing the completed test: diagnostic + adaptive intervention\n');

let notFoundHandled = false;
try {
  await analyzeAptitudeAssessment(crypto.randomUUID());
} catch {
  notFoundHandled = true;
}
check('analyzing an unknown test id fails cleanly, not a crash', notFoundHandled);

const analysis = await analyzeAptitudeAssessment(testId);
check('the analysis reports the real score and question count', analysis.score === Number(score.toFixed(2)) && analysis.questionCount === 25);
check('it reports a sensible estimated time', typeof analysis.estimatedMinutes === 'number' && analysis.estimatedMinutes > 0);
check(
  'the deliberately weak topic appears in report.weaknesses',
  analysis.report.weaknesses.some((w) => w.topicId === weakTopicId),
  weakTopicId
);
check(
  'the deliberately weak, slow topic is flagged as a speed issue',
  analysis.report.speedIssues.some((s) => s.topicId === weakTopicId)
);
check(
  'a concrete adaptive intervention (Phase 11, reused) was produced for the weak topic',
  analysis.adaptiveInterventions.some((i) => i.topicId === weakTopicId && typeof i.decision.action === 'string')
);
check('confidenceIssues is honestly empty — the weekly test collects no confidence data', analysis.report.confidenceIssues.length === 0);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM test_answer WHERE test_id = $1`, [testId]);
await client.query(`DELETE FROM test_question WHERE test_id = $1`, [testId]);
await client.query(`DELETE FROM test WHERE id = $1`, [testId]);
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase19-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('aptitude assessment layer smoke test passed');
