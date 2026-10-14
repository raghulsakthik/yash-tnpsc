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
import { weightedAccuracy, speedScore } from '../src/domain/accuracy.mjs';
import { adaptDifficulty } from '../src/domain/difficulty.mjs';
import { classifyMistake } from '../src/domain/mistakes.mjs';
import { selectQuestion, selectTopic } from '../src/domain/selection.mjs';
import { conceptScore, consistencyScore, confidenceCalibration, masteryScore } from '../src/domain/mastery.mjs';
import { recallPerformance, nextInterval, retentionValue } from '../src/domain/revision.mjs';

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

/** Mirrors POST /api/attempts. */
async function recordAttempt(learnerId, question, { correct, timeTakenMs, confidence, mode = 'PRACTICE' }) {
  const { rows: priorRows } = await client.query(
    `SELECT accuracy_score::float8 AS accuracy, consecutive_wrong, attempt_count, correct_count,
            current_difficulty::float8 AS current_difficulty, retention_score::float8 AS retention_score
       FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, TOPIC]
  );
  const prior = priorRows[0] ?? {
    accuracy: 0,
    consecutive_wrong: 0,
    attempt_count: 0,
    correct_count: 0,
    current_difficulty: 0.3,
    retention_score: 0,
  };

  const mistakeType = classifyMistake({
    correct,
    timeTakenMs,
    expectedSeconds: question.estimated_seconds,
    confidence,
    topicAccuracy: prior.accuracy,
  });

  const attemptId = crypto.randomUUID();
  const inserted = await client.query(
    `INSERT INTO question_attempt
       (id, learner_id, question_id, topic_id, selected_index, correct, time_taken_ms, confidence, mistake_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
    [
      attemptId,
      learnerId,
      question.id,
      TOPIC,
      correct ? question.answer_index : (question.answer_index + 1) % 4,
      correct,
      timeTakenMs,
      confidence,
      mistakeType,
    ]
  );

  const { rows: recent } = await client.query(
    `SELECT a.correct, a.time_taken_ms, a.confidence, q.estimated_seconds
       FROM question_attempt a JOIN question q ON q.id = a.question_id
      WHERE a.learner_id = $1 AND a.topic_id = $2
      ORDER BY a.created_at DESC LIMIT 20`,
    [learnerId, TOPIC]
  );

  const accuracy = weightedAccuracy(recent.map((r) => ({ correct: r.correct })));
  const speed = speedScore(
    recent.map((r) => ({
      correct: r.correct,
      timeTakenMs: r.time_taken_ms,
      expectedSeconds: r.estimated_seconds,
    }))
  );
  const consecutiveWrong = correct ? 0 : Number(prior.consecutive_wrong) + 1;
  const attemptCount = Number(prior.attempt_count) + 1;
  const correctCount = Number(prior.correct_count) + (correct ? 1 : 0);

  const concept = conceptScore(correctCount, attemptCount);
  const consistency = consistencyScore(recent.map((r) => ({ correct: r.correct })));
  const confidenceCalib = confidenceCalibration(recent.map((r) => ({ correct: r.correct, confidence: r.confidence })));

  const adaptation = adaptDifficulty({
    currentDifficulty: Number(prior.current_difficulty),
    accuracy,
    speed,
    consecutiveWrong,
    attemptCount,
  });

  const { rows: scheduleRows } = await client.query(
    `SELECT interval_days::float8 AS interval_days FROM revision_schedule WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, TOPIC]
  );

  let retentionScore = Number(prior.retention_score);
  let performance = null;

  if (scheduleRows.length === 0) {
    await client.query(
      `INSERT INTO revision_schedule (learner_id, topic_id, scheduled_at, interval_days, status)
       VALUES ($1, $2, now() + INTERVAL '1 day', 1, 'SCHEDULED')`,
      [learnerId, TOPIC]
    );
  } else if (mode === 'REVISION') {
    performance = recallPerformance({
      correct,
      timeTakenMs,
      expectedSeconds: question.estimated_seconds,
      confidence,
    });
    const interval = nextInterval(scheduleRows[0].interval_days, performance);
    retentionScore = retentionScore * 0.7 + retentionValue(performance) * 0.3;

    await client.query(
      `UPDATE revision_schedule
          SET interval_days = $1, scheduled_at = now() + ($2::float8 * INTERVAL '1 day'), updated_at = now()
        WHERE learner_id = $3 AND topic_id = $4`,
      [interval, interval, learnerId, TOPIC]
    );
  }

  const mastery = masteryScore({
    concept,
    accuracy,
    speed,
    retention: retentionScore,
    consistency,
    confidence: confidenceCalib,
  });

  await client.query(
    `INSERT INTO learner_topic_state
       (learner_id, topic_id, accuracy_score, speed_score, current_difficulty,
        attempt_count, correct_count, consecutive_wrong, next_action, last_studied_at, updated_at,
        concept_score, consistency_score, confidence_score, retention_score, mastery_score)
     VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8, now(), now(), $9,$10,$11,$12,$13)
     ON CONFLICT (learner_id, topic_id) DO UPDATE SET
       accuracy_score = EXCLUDED.accuracy_score,
       speed_score = EXCLUDED.speed_score,
       current_difficulty = EXCLUDED.current_difficulty,
       attempt_count = learner_topic_state.attempt_count + 1,
       correct_count = learner_topic_state.correct_count + $6,
       consecutive_wrong = EXCLUDED.consecutive_wrong,
       next_action = EXCLUDED.next_action,
       last_studied_at = now(),
       updated_at = now(),
       concept_score = EXCLUDED.concept_score,
       consistency_score = EXCLUDED.consistency_score,
       confidence_score = EXCLUDED.confidence_score,
       retention_score = EXCLUDED.retention_score,
       mastery_score = EXCLUDED.mastery_score`,
    [
      learnerId,
      TOPIC,
      accuracy.toFixed(3),
      speed.toFixed(3),
      adaptation.difficulty,
      correct ? 1 : 0,
      consecutiveWrong,
      adaptation.nextAction,
      concept.toFixed(3),
      consistency.toFixed(3),
      confidenceCalib.toFixed(3),
      retentionScore.toFixed(3),
      mastery.toFixed(3),
    ]
  );

  return { adaptation, mistakeType, accuracy, mastery, performance, attemptId, duplicate: inserted.rowCount === 0 };
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

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('loop smoke test passed');
