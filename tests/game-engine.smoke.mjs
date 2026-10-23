#!/usr/bin/env node
// Phase 22 exit test, against a real database:
//
//   DATABASE_URL=... node tests/game-engine.smoke.mjs
//
// "Game results feed the Learner Model exactly like normal practice."
// Proves it against a real game session on the real seeded syllabus: every
// answered question is graded through the exact same recordAttempt()
// pipeline (mode: 'GAME') as any other activity, updating real
// learner_topic_state and revision_schedule rows — not a separate scoring
// system that happens to reach similar numbers.

import crypto from 'node:crypto';
import pg from 'pg';
import { startGame, saveGameAnswer, submitGame, getGameSession } from '../src/services/gameService.mjs';
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

console.log('\nStarting a real game session from a real, seeded GameDefinition\n');

const learner = await makeLearner('smoke-phase22-game');
const session = await startGame(learner, 'speed-round-aptitude');
check('a real question set was drawn from the configured topics/difficulty band', session.questions.length > 0 && session.questions.length <= 10);
check('answer keys are withheld while the game is in progress', session.questions.every((q) => q.correctIndex === undefined));

const resumed = await startGame(learner, 'speed-round-aptitude');
check('starting again resumes the same in-progress session, not a duplicate', resumed.sessionId === session.sessionId);

console.log('\nAnswering every question, then submitting\n');

const { rows: keyRows } = await client.query(
  `SELECT gq.question_id, q.answer_index, q.estimated_seconds FROM game_question gq JOIN question q ON q.id = gq.question_id WHERE gq.game_session_id = $1 ORDER BY gq.order_index`,
  [session.sessionId]
);
for (const [i, row] of keyRows.entries()) {
  const makeWrong = i === 0; // the first question deliberately wrong, everything else right and fast
  await saveGameAnswer(session.sessionId, {
    questionId: row.question_id,
    selectedIndex: makeWrong ? (row.answer_index + 1) % 4 : row.answer_index,
    timeTakenMs: Math.round(row.estimated_seconds * 1000 * 0.5), // fast, for a real speed bonus
  });
}

const submitted = await submitGame(session.sessionId, learner);
check('the score reflects one wrong, the rest right', submitted.correctCount === keyRows.length - 1, `${submitted.correctCount}/${keyRows.length}`);
check('a real, positive total score was computed (base + speed + streak bonuses)', submitted.totalScore > 0);

console.log('\nResults fed the Learner Model exactly like normal practice — not a separate system\n');

const { rows: attemptRows } = await client.query(`SELECT COUNT(*)::int AS n FROM question_attempt WHERE learner_id = $1`, [learner]);
check('every graded question wrote a real question_attempt row', attemptRows[0].n === keyRows.length);

const { rows: stateRows } = await client.query(
  `SELECT COUNT(*)::int AS n FROM learner_topic_state WHERE learner_id = $1 AND attempt_count > 0`,
  [learner]
);
check('real learner_topic_state rows were created/updated from the game, same as any practice session', stateRows[0].n > 0);

const { rows: revisionRows } = await client.query(`SELECT COUNT(*)::int AS n FROM revision_schedule WHERE learner_id = $1`, [learner]);
check('the spaced-repetition schedule was seeded from the game, exactly as for any other first attempt', revisionRows[0].n > 0);

const final = await getGameSession(session.sessionId);
check('reading the completed session now reveals answer keys and points', final.questions.every((q) => q.correctIndex !== undefined));

console.log('\nAnswering or submitting an already-finished game is refused\n');

let refused = false;
try {
  await saveGameAnswer(session.sessionId, { questionId: keyRows[0].question_id, selectedIndex: 0, timeTakenMs: 1000 });
} catch (err) {
  refused = err instanceof ValidationError;
}
check('answering a completed game is refused, not silently accepted', refused);

// ------------------------------------------------------------------ cleanup
await client.query(`DELETE FROM game_attempt WHERE game_session_id = $1`, [session.sessionId]);
await client.query(`DELETE FROM game_question WHERE game_session_id = $1`, [session.sessionId]);
await client.query(`DELETE FROM game_session WHERE id = $1`, [session.sessionId]);
await client.query(`DELETE FROM question_attempt WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner_topic_state WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM revision_schedule WHERE learner_id = $1`, [learner]);
await client.query(`DELETE FROM learner WHERE name LIKE 'smoke-phase22-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('subject-specific game engine smoke test passed');
