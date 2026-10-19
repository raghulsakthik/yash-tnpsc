// Phase 22 — repository for the new game_definition/game_session/
// game_question/game_attempt tables (V11).
import { query } from '../lib/db.mjs';

export async function findGameDefinition(id, client = { query }) {
  const result = await client.query(`SELECT * FROM game_definition WHERE id = $1 AND status = 'ACTIVE'`, [id]);
  return result.rows[0] ?? null;
}

export async function findQuestionsForDefinition(definition, client = { query }) {
  const result = await client.query(
    `SELECT id, topic_id, difficulty::float8 AS difficulty, estimated_seconds, answer_index
       FROM question
      WHERE status = 'PUBLISHED' AND topic_id = ANY($1)
        AND difficulty BETWEEN $2 AND $3`,
    [definition.target_topic_ids, definition.difficulty_floor, definition.difficulty_ceiling]
  );
  return result.rows;
}

export async function findActiveGameSession(learnerId, gameDefinitionId, client = { query }) {
  const result = await client.query(
    `SELECT id FROM game_session
      WHERE learner_id = $1 AND game_definition_id = $2 AND status = 'IN_PROGRESS'
      ORDER BY started_at DESC LIMIT 1`,
    [learnerId, gameDefinitionId]
  );
  return result.rows[0] ?? null;
}

export async function createGameSession({ learnerId, gameDefinitionId }, client = { query }) {
  const result = await client.query(
    `INSERT INTO game_session (learner_id, game_definition_id) VALUES ($1, $2) RETURNING id`,
    [learnerId, gameDefinitionId]
  );
  return result.rows[0];
}

export async function insertGameQuestions(sessionId, questionIds, client = { query }) {
  for (const [index, questionId] of questionIds.entries()) {
    await client.query('INSERT INTO game_question (game_session_id, question_id, order_index) VALUES ($1, $2, $3)', [
      sessionId,
      questionId,
      index,
    ]);
  }
}

export async function findGameSession(sessionId, client = { query }) {
  const result = await client.query(
    `SELECT gs.id, gs.game_definition_id, gs.learner_id, gs.status, gs.started_at, gs.completed_at,
            gs.total_score::float8 AS total_score, gd.time_limit_seconds, gd.mechanics, gd.name
       FROM game_session gs JOIN game_definition gd ON gd.id = gs.game_definition_id
      WHERE gs.id = $1`,
    [sessionId]
  );
  return result.rows[0] ?? null;
}

export async function findGameQuestionsWithAnswers(sessionId, client = { query }) {
  const result = await client.query(
    `SELECT gq.order_index, q.id AS question_id, q.topic_id, q.prompt, q.options,
            q.difficulty::float8 AS difficulty, q.estimated_seconds, q.answer_index, q.explanation,
            ga.selected_index, ga.time_taken_ms, ga.correct, ga.points_awarded
       FROM game_question gq
       JOIN question q ON q.id = gq.question_id
       LEFT JOIN game_attempt ga ON ga.game_session_id = gq.game_session_id AND ga.question_id = gq.question_id
      WHERE gq.game_session_id = $1
      ORDER BY gq.order_index`,
    [sessionId]
  );
  return result.rows;
}

export async function upsertGameAnswer({ sessionId, questionId, selectedIndex, timeTakenMs }, client = { query }) {
  await client.query(
    `INSERT INTO game_attempt (game_session_id, question_id, selected_index, time_taken_ms, answered_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (game_session_id, question_id) DO UPDATE SET
       selected_index = EXCLUDED.selected_index, time_taken_ms = EXCLUDED.time_taken_ms, answered_at = now()`,
    [sessionId, questionId, selectedIndex, timeTakenMs]
  );
}

export async function markGameAttemptScored({ sessionId, questionId, correct, points }, client = { query }) {
  await client.query(
    `UPDATE game_attempt SET correct = $3, points_awarded = $4 WHERE game_session_id = $1 AND question_id = $2`,
    [sessionId, questionId, correct, points]
  );
}

export async function completeGameSession(sessionId, totalScore, client = { query }) {
  const result = await client.query(
    `UPDATE game_session SET status = 'COMPLETED', completed_at = now(), total_score = $2 WHERE id = $1
     RETURNING id, status, total_score::float8 AS total_score, completed_at`,
    [sessionId, totalScore]
  );
  return result.rows[0] ?? null;
}
