#!/usr/bin/env node
// End-to-end smoke test of the learning loop against a real database, without
// booting Next.js. It runs the same SQL and the same domain functions the API
// routes use, so a passing run means the loop works, not just the unit tests.
//
//   DATABASE_URL=... node tests/loop.smoke.mjs
//
// It simulates two learners on the same bank: one answering well, one badly,
// and asserts the engine moves their difficulty in opposite directions.

import crypto from 'node:crypto';
import pg from 'pg';
import { selectQuestion, selectTopic } from '../src/domain/selection.mjs';
import { allocateSlots, pickTopicQuestions } from '../src/domain/testGen.mjs';
import { recordAttempt as sharedRecordAttempt } from '../src/lib/attempts.mjs';

const TOPIC = 'aptitude.fractions';
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

/** Mirrors GET /api/questions/next. */
async function nextQuestion(learnerId) {
  const { rows: stateRows } = await client.query(
    `SELECT current_difficulty::float8 AS d FROM learner_topic_state
      WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, TOPIC]
  );
  const target = stateRows[0]?.d ?? 0.3;

  const { rows: candidates } = await client.query(
    `SELECT q.id, q.answer_index, q.difficulty::float8 AS difficulty, q.source,
            q.estimated_seconds, COUNT(a.id)::int AS seen_count
       FROM question q
       LEFT JOIN question_attempt a ON a.question_id = q.id AND a.learner_id = $1
      WHERE q.topic_id = $2 AND q.status = 'PUBLISHED'
      GROUP BY q.id`,
    [learnerId, TOPIC]
  );

  return {
    target,
    question: selectQuestion(
      candidates.map((c) => ({ ...c, seenCount: c.seen_count, attemptsSinceLastSeen: 0 })),
      target
    ),
  };
}

/**
 * Mirrors POST /api/attempts by calling the exact same shared pipeline the
 * real route and the weekly test's submit step use — one transaction per
 * attempt, same as the route does. No parallel copy of the grading logic
 * to drift out of sync with it.
 */
async function recordAttempt(learnerId, question, { correct, timeTakenMs, confidence, mode = 'PRACTICE' }) {
  const attemptId = crypto.randomUUID();
  const selectedIndex = correct ? question.answer_index : (question.answer_index + 1) % 4;

  await client.query('BEGIN');
  const result = await sharedRecordAttempt({
    client,
    learnerId,
    questionId: question.id,
    attemptId,
    selectedIndex,
    timeTakenMs,
    confidence,
    mode,
  });
  await client.query('COMMIT');

  return {
    adaptation: { nextAction: result.nextAction, difficulty: result.state?.difficulty, reason: result.reason },
    mistakeType: result.mistakeType,
    accuracy: result.state?.accuracy,
    mastery: result.state?.mastery,
    performance: result.performance,
    attemptId,
    duplicate: Boolean(result.duplicate),
  };
}

async function stateOf(learnerId) {
  const { rows } = await client.query(
    `SELECT accuracy_score::float8 AS accuracy, current_difficulty::float8 AS difficulty,
            attempt_count, correct_count, next_action, mastery_score::float8 AS mastery
       FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, TOPIC]
  );
  return rows[0];
}

async function revisionScheduleOf(learnerId) {
  const { rows } = await client.query(
    `SELECT interval_days::float8 AS interval_days, scheduled_at
       FROM revision_schedule WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, TOPIC]
  );
  return rows[0];
}

// ----------------------------------------------------------------- the runs

console.log('\nthe bank');
const { rows: bank } = await client.query(
  `SELECT COUNT(*)::int AS n FROM question WHERE topic_id = $1 AND status = 'PUBLISHED'`,
  [TOPIC]
);
check('questions are seeded', bank[0].n >= 25, `(${bank[0].n})`);

console.log('\na learner who is getting them right');
const strong = await makeLearner('smoke-strong');
let last;
for (let i = 0; i < 14; i += 1) {
  const { question } = await nextQuestion(strong);
  last = await recordAttempt(strong, question, {
    correct: true,
    timeTakenMs: question.estimated_seconds * 500, // twice as fast as expected
    confidence: 4,
  });
}
const strongState = await stateOf(strong);
check('difficulty rose above the 0.30 start', strongState.difficulty > 0.3, `(${strongState.difficulty})`);
check('accuracy reads high', strongState.accuracy > 0.9, `(${strongState.accuracy})`);
check('next action is a harder question', strongState.next_action === 'HARDER_QUESTION', `(${strongState.next_action})`);
check('all 14 attempts were counted', strongState.attempt_count === 14, `(${strongState.attempt_count})`);

console.log('\na learner who is struggling');
const weak = await makeLearner('smoke-weak');
for (let i = 0; i < 14; i += 1) {
  const { question } = await nextQuestion(weak);
  await recordAttempt(weak, question, {
    correct: false,
    timeTakenMs: question.estimated_seconds * 1000,
    confidence: 2,
  });
}
const weakState = await stateOf(weak);
check('difficulty fell below the start', weakState.difficulty < 0.3, `(${weakState.difficulty})`);
check('the engine asks for the prerequisite', weakState.next_action === 'REVIEW_PREREQUISITE', `(${weakState.next_action})`);
check(
  'the two learners diverged',
  strongState.difficulty > weakState.difficulty,
  `(${strongState.difficulty} vs ${weakState.difficulty})`
);

console.log('\nthe engine picks questions near the target difficulty');
const { target, question: picked } = await nextQuestion(strong);
check(
  'chosen question sits near the raised target',
  Math.abs(picked.difficulty - target) <= 0.3,
  `(target ${target}, picked ${picked.difficulty})`
);

console.log('\nresubmitting the same attempt does not double count');
const before = (await stateOf(strong)).attempt_count;
const { question: q } = await nextQuestion(strong);
const first = await recordAttempt(strong, q, { correct: true, timeTakenMs: 20000, confidence: 3 });
const replay = await client.query(
  `INSERT INTO question_attempt
     (id, learner_id, question_id, topic_id, selected_index, correct, time_taken_ms, confidence)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
  [first.attemptId, strong, q.id, TOPIC, q.answer_index, true, 20000, 3]
);
check('the duplicate insert was rejected', replay.rowCount === 0);
check('attempt count rose by exactly one', (await stateOf(strong)).attempt_count === before + 1);

console.log('\nmistake classification is wired through to the database');
const careless = await makeLearner('smoke-careless');
for (let i = 0; i < 8; i += 1) {
  const { question } = await nextQuestion(careless);
  await recordAttempt(careless, question, { correct: true, timeTakenMs: 30000, confidence: 4 });
}
const { question: slipQ } = await nextQuestion(careless);
const slip = await recordAttempt(careless, slipQ, {
  correct: false,
  timeTakenMs: slipQ.estimated_seconds * 900,
  confidence: 2,
});
check('a strong learner answering wrong at normal pace is CARELESS', slip.mistakeType === 'CARELESS', `(${slip.mistakeType})`);

const { rows: stored } = await client.query(
  `SELECT mistake_type FROM question_attempt
    WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 1`,
  [careless]
);
check('the classification was persisted', stored[0].mistake_type === 'CARELESS', `(${stored[0].mistake_type})`);

console.log('\nmastery score is persisted alongside accuracy and speed');
const strongMastery = await stateOf(strong);
check('mastery score is a plausible fraction', strongMastery.mastery > 0 && strongMastery.mastery <= 1, `(${strongMastery.mastery})`);

console.log('\na topic\'s first attempt schedules its first revision');
const fresh = await makeLearner('smoke-fresh');
{
  const { question } = await nextQuestion(fresh);
  await recordAttempt(fresh, question, { correct: true, timeTakenMs: 20000, confidence: 4 });
}
const freshSchedule = await revisionScheduleOf(fresh);
check('a revision_schedule row now exists', Boolean(freshSchedule));
check('its interval starts at 1 day', Number(freshSchedule?.interval_days) === 1, `(${freshSchedule?.interval_days})`);
check(
  'it is scheduled roughly a day out',
  freshSchedule && new Date(freshSchedule.scheduled_at).getTime() > Date.now() + 23 * 3600 * 1000
);

console.log('\na GOOD revision attempt grows the interval; a POOR one shrinks it');
const reviser = await makeLearner('smoke-reviser');
{
  const { question } = await nextQuestion(reviser);
  await recordAttempt(reviser, question, { correct: true, timeTakenMs: 20000, confidence: 4 });
}
const beforeGood = await revisionScheduleOf(reviser);
{
  const { question } = await nextQuestion(reviser);
  const result = await recordAttempt(reviser, question, {
    correct: true,
    timeTakenMs: 20000,
    confidence: 4,
    mode: 'REVISION',
  });
  check('a fast, confident, correct revision reads as GOOD', result.performance === 'GOOD', `(${result.performance})`);
}
const afterGood = await revisionScheduleOf(reviser);
check(
  'the interval grew after a GOOD revision',
  Number(afterGood.interval_days) > Number(beforeGood.interval_days),
  `(${beforeGood.interval_days} -> ${afterGood.interval_days})`
);

{
  const { question } = await nextQuestion(reviser);
  const result = await recordAttempt(reviser, question, {
    correct: false,
    timeTakenMs: 20000,
    confidence: 2,
    mode: 'REVISION',
  });
  check('a wrong revision reads as POOR', result.performance === 'POOR', `(${result.performance})`);
}
const afterPoor = await revisionScheduleOf(reviser);
check(
  'the interval shrank after a POOR revision',
  Number(afterPoor.interval_days) < Number(afterGood.interval_days),
  `(${afterGood.interval_days} -> ${afterPoor.interval_days})`
);

console.log('\na PRACTICE-mode attempt never advances an existing revision schedule');
const practiceOnly = await makeLearner('smoke-practice-only');
{
  const { question } = await nextQuestion(practiceOnly);
  await recordAttempt(practiceOnly, question, { correct: true, timeTakenMs: 20000, confidence: 4 });
}
const beforePractice = await revisionScheduleOf(practiceOnly);
{
  const { question } = await nextQuestion(practiceOnly);
  await recordAttempt(practiceOnly, question, { correct: true, timeTakenMs: 20000, confidence: 4, mode: 'PRACTICE' });
}
const afterPractice = await revisionScheduleOf(practiceOnly);
check(
  'the interval is unchanged by a PRACTICE attempt',
  Number(afterPractice.interval_days) === Number(beforePractice.interval_days)
);

console.log('\nthe daily plan picks a sane primary topic from real learner_topic_state');
{
  const { rows: topicRows } = await client.query(
    `SELECT t.id, t.name,
            COALESCE(lts.accuracy_score::float8, 0) AS accuracy,
            COALESCE(lts.attempt_count, 0) AS attempt_count
       FROM topic t
       LEFT JOIN learner_topic_state lts ON lts.topic_id = t.id AND lts.learner_id = $1
      WHERE t.id = $2`,
    [strong, TOPIC]
  );
  const picked = selectTopic(
    topicRows.map((t) => ({
      id: t.id,
      name: t.name,
      accuracy: t.accuracy,
      attemptCount: t.attempt_count,
      examWeight: 0,
      prerequisiteGap: 0,
    }))
  );
  check('selectTopic returns the only candidate topic', picked?.id === TOPIC, `(${picked?.id})`);
}

console.log('\nexam weight comes from the seeded syllabus, not a constant');
const { rows: weights } = await client.query(
  `SELECT c.id, c.question_count, COUNT(t.id)::int AS topics
     FROM chapter c LEFT JOIN topic t ON t.chapter_id = c.id
    WHERE c.id IN ('gs.indian-polity', 'apt.foundation')
    GROUP BY c.id, c.question_count`
);
const polity = weights.find((w) => w.id === 'gs.indian-polity');
const foundation = weights.find((w) => w.id === 'apt.foundation');
check('polity carries its real 15 questions', polity?.question_count === 15, `(${polity?.question_count})`);
check('unexamined foundation carries zero weight', foundation?.question_count === 0, `(${foundation?.question_count})`);

console.log('\na weekly test generates, can be answered, and scores on submit');
const tester = await makeLearner('smoke-tester');
{
  // Mirrors POST /api/tests: allocate slots across the examined chapters,
  // pick questions, insert the test.
  const { rows: chapterTopics } = await client.query(
    `SELECT c.id AS chapter_id, c.question_count, t.id AS topic_id, t.name AS topic_name
       FROM chapter c JOIN topic t ON t.chapter_id = c.id
      WHERE c.id IN ('apt.aptitude', 'apt.reasoning')`
  );
  const { rows: bankRows } = await client.query(
    `SELECT topic_id, id, difficulty::float8 AS difficulty, answer_index
       FROM question WHERE status = 'PUBLISHED'`
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
    [tester, picked.length]
  );
  const testId = testRows[0].id;
  for (const [index, q] of picked.entries()) {
    await client.query(`INSERT INTO test_question (test_id, question_id, order_index) VALUES ($1, $2, $3)`, [
      testId,
      q.id,
      index,
    ]);
  }

  // Answer every question (mirrors POST /api/tests/:id/answers). The first
  // one is deliberately wrong, to prove submission scores it as wrong and
  // that it then surfaces in the mistake bank.
  const wrongQuestionId = picked[0].id;
  for (const q of picked) {
    const selectedIndex = q.id === wrongQuestionId ? (q.answer_index + 1) % 4 : q.answer_index;
    await client.query(
      `INSERT INTO test_answer (test_id, question_id, selected_index, time_taken_ms)
       VALUES ($1, $2, $3, $4)`,
      [testId, q.id, selectedIndex, 20000]
    );
  }

  // Submit (mirrors POST /api/tests/:id/submit): grade every answer through
  // the same shared pipeline, mark the test complete, score it.
  await client.query('BEGIN');
  let correctCount = 0;
  for (const q of picked) {
    const { rows: ansRows } = await client.query(
      `SELECT selected_index, time_taken_ms FROM test_answer WHERE test_id = $1 AND question_id = $2`,
      [testId, q.id]
    );
    const answer = ansRows[0];
    const result = await sharedRecordAttempt({
      client,
      learnerId: tester,
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
  await client.query(`UPDATE test SET status = 'COMPLETED', completed_at = now(), score = $1 WHERE id = $2`, [
    score.toFixed(2),
    testId,
  ]);
  await client.query('COMMIT');

  check('exactly one question was wrong, as arranged', correctCount === picked.length - 1, `(${correctCount}/${picked.length})`);
  check('the score reflects 24/25 correct', Math.abs(score - 96) < 0.01, `(${score})`);

  const { rows: graded } = await client.query(
    `SELECT COUNT(*)::int AS n FROM question_attempt WHERE learner_id = $1`,
    [tester]
  );
  check('every graded question wrote a question_attempt row', graded[0].n === picked.length, `(${graded[0].n})`);

  console.log('\nthe wrong test answer surfaces in the mistake bank');
  const { rows: mistakes } = await client.query(
    `WITH wrong AS (
       SELECT DISTINCT ON (question_id) question_id, created_at
         FROM question_attempt
        WHERE learner_id = $1 AND correct = false
        ORDER BY question_id, created_at DESC
     ),
     resolved AS (
       SELECT DISTINCT w.question_id
         FROM question_attempt qa
         JOIN wrong w ON w.question_id = qa.question_id
        WHERE qa.learner_id = $1 AND qa.correct = true AND qa.created_at > w.created_at
     )
     SELECT w.question_id FROM wrong w
       LEFT JOIN resolved r ON r.question_id = w.question_id
      WHERE r.question_id IS NULL
      ORDER BY w.created_at DESC LIMIT 1`,
    [tester]
  );
  check('the mistake bank surfaces the wrong answer', mistakes[0]?.question_id === wrongQuestionId, `(${mistakes[0]?.question_id})`);

  // Answer it correctly afterward and confirm it drops out of the bank.
  const { rows: wrongQ } = await client.query(`SELECT id, answer_index, estimated_seconds FROM question WHERE id = $1`, [
    wrongQuestionId,
  ]);
  await recordAttempt(
    tester,
    { id: wrongQ[0].id, answer_index: wrongQ[0].answer_index, estimated_seconds: wrongQ[0].estimated_seconds },
    { correct: true, timeTakenMs: 15000, confidence: 4 }
  );
  const { rows: stillOpen } = await client.query(
    `SELECT 1 FROM question_attempt qa
      WHERE qa.learner_id = $1 AND qa.question_id = $2 AND qa.correct = false
        AND NOT EXISTS (
          SELECT 1 FROM question_attempt later
           WHERE later.learner_id = $1 AND later.question_id = $2
             AND later.correct = true AND later.created_at > qa.created_at
        )`,
    [tester, wrongQuestionId]
  );
  check('the corrected mistake is no longer open', stillOpen.length === 0);
}

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('loop smoke test passed');
