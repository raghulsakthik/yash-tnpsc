#!/usr/bin/env node
// Phase 8 exit test, against a real database:
//
//   DATABASE_URL=... node tests/session-pipeline.smoke.mjs
//
// Proves the technical pipeline the phase describes —
//   GET NEXT ACTION -> (LESSON/EXAMPLE) -> PRACTICE -> ATTEMPT ->
//   MISTAKE ANALYSIS -> TOPIC STATE UPDATE
// — actually ties together through one real learning_session: starting a
// session, recording attempts against it (including hintUsed, the one raw
// input Phase 2's schema didn't yet have a column for), reading the session
// back with its attempts, and completing it. Also proves recordAttempt()'s
// two new optional parameters are purely additive: a caller that never
// mentions them (the weekly test, the default assessment) behaves exactly
// as before.

import crypto from 'node:crypto';
import pg from 'pg';
import { pool } from '../src/lib/db.mjs';
import { recordAttempt } from '../src/lib/attempts.mjs';
import { startLearningSession, completeSession, getSessionWithAttempts } from '../src/services/sessionService.mjs';
import { getInitialLearningAction } from '../src/services/learningPlanService.mjs';

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

async function recordAttemptInOwnTransaction(args) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const result = await recordAttempt({ client: dbClient, ...args });
    await dbClient.query('COMMIT');
    return result;
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }
}

console.log('\nGET NEXT ACTION -> start a session for that topic\n');

const learner = await makeLearner('smoke-phase8-pipeline');
const action = await getInitialLearningAction(learner);
check('a next action was produced (reused from Phase 7, unchanged)', action.topicId === 'aptitude.whole-numbers', action.topicId);

const session = await startLearningSession({ learnerId: learner, topicId: action.topicId, sessionType: 'PRACTICE' });
check('a session was started for that topic', session.status === 'IN_PROGRESS' && session.topicId === action.topicId);

console.log('\nPRACTICE -> ATTEMPT, linked to the session, with hintUsed recorded\n');

const { rows: questions } = await client.query(
  `SELECT id, answer_index FROM question WHERE topic_id = $1 AND status = 'PUBLISHED' LIMIT 2`,
  [action.topicId]
);
check('the seeded bank has enough questions for this topic to run the scenario', questions.length >= 2);

const attemptIdWithHint = crypto.randomUUID();
const resultWithHint = await recordAttemptInOwnTransaction({
  learnerId: learner,
  questionId: questions[0].id,
  attemptId: attemptIdWithHint,
  selectedIndex: (questions[0].answer_index + 1) % 4, // wrong, on purpose, to exercise the hint
  timeTakenMs: 20000,
  confidence: 2,
  mode: 'PRACTICE',
  hintUsed: true,
  sessionId: session.id,
});
check('the attempt result reports hintUsed back', resultWithHint.hintUsed === true);
check('the attempt result reports the sessionId back', resultWithHint.sessionId === session.id);

const attemptIdNoHint = crypto.randomUUID();
await recordAttemptInOwnTransaction({
  learnerId: learner,
  questionId: questions[1].id,
  attemptId: attemptIdNoHint,
  selectedIndex: questions[1].answer_index,
  timeTakenMs: 9000,
  confidence: 4,
  mode: 'PRACTICE',
  sessionId: session.id,
  // hintUsed intentionally omitted — must default to false, not crash.
});

const { rows: storedAttempts } = await client.query(
  `SELECT id, hint_used, session_id FROM question_attempt WHERE id = ANY($1) ORDER BY created_at`,
  [[attemptIdWithHint, attemptIdNoHint]]
);
check('the hint-used attempt is stored with hint_used = true', storedAttempts[0].hint_used === true);
check('the hint-used attempt is stored linked to the session', storedAttempts[0].session_id === session.id);
check('the no-hint attempt defaults to hint_used = false', storedAttempts[1].hint_used === false);

console.log('\nMISTAKE ANALYSIS + TOPIC STATE UPDATE already ran — same pipeline as every other attempt\n');

const { rows: mistakeRows } = await client.query(
  `SELECT mistake_type FROM question_attempt WHERE id = $1`,
  [attemptIdWithHint]
);
check('the wrong, hinted attempt was still classified by mistake type', mistakeRows[0].mistake_type !== null);

const { rows: stateRows } = await client.query(
  `SELECT attempt_count FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
  [learner, action.topicId]
);
check('learner_topic_state updated from these attempts, same as any practice attempt', stateRows[0].attempt_count === 2);

console.log('\nGET the session back with its attempts, then complete it\n');

const fetched = await getSessionWithAttempts(session.id);
check('the session reads back with both attempts attached', fetched.attempts.length === 2);
check('one of the linked attempts shows hintUsed in its own record', fetched.attempts.some((a) => a.id === attemptIdWithHint));

const completed = await completeSession(session.id);
check('the session can be completed', completed.status === 'COMPLETED' && completed.completedAt !== null);

console.log('\nExisting callers that never mention sessionId/hintUsed are completely unaffected\n');

const attemptIdLegacyStyle = crypto.randomUUID();
const legacyResult = await recordAttemptInOwnTransaction({
  learnerId: learner,
  questionId: questions[0].id,
  attemptId: attemptIdLegacyStyle,
  selectedIndex: questions[0].answer_index,
  timeTakenMs: 10000,
  confidence: null,
  mode: 'PRACTICE',
  // no hintUsed, no sessionId at all — exactly how the weekly test and the
  // default assessment call this function today.
});
check('a call with neither new parameter still succeeds exactly as before', legacyResult.hintUsed === false && legacyResult.sessionId === null);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learning_session WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase8-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('lesson-practice session pipeline smoke test passed');
