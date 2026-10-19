// Phase 22 — GameService. Every question a game serves is graded through
// the exact same recordAttempt() pipeline (mode: 'GAME') every other
// activity type already uses — "game results feed the Learner Model
// exactly like normal practice" is literal here, not a separate scoring
// system reaching the same numbers a different way.
import crypto from 'node:crypto';
import { pool } from '../lib/db.mjs';
import { recordAttempt } from '../lib/attempts.mjs';
import { pickTopicQuestions } from '../domain/testGen.mjs';
import { scoreGameSession } from '../domain/gameEngine.mjs';
import {
  findGameDefinition,
  findQuestionsForDefinition,
  findActiveGameSession,
  createGameSession,
  insertGameQuestions,
  findGameSession,
  findGameQuestionsWithAnswers,
  upsertGameAnswer,
  markGameAttemptScored,
  completeGameSession,
} from '../repository/gameRepository.mjs';
import { ValidationError, NotFoundError } from './errors.mjs';

export async function startGame(learnerId, gameDefinitionId) {
  const definition = await findGameDefinition(gameDefinitionId);
  if (!definition) throw new NotFoundError(`no active game definition ${gameDefinitionId}`);

  const existing = await findActiveGameSession(learnerId, gameDefinitionId);
  if (existing) return getGameSession(existing.id);

  const questions = await findQuestionsForDefinition(definition);
  if (questions.length === 0) {
    throw new ValidationError([`no published questions match ${gameDefinitionId}'s configuration yet`]);
  }

  const picked = pickTopicQuestions(questions, Math.min(definition.question_count, questions.length), new Set());

  const session = await createGameSession({ learnerId, gameDefinitionId });
  await insertGameQuestions(session.id, picked.map((q) => q.id));
  return getGameSession(session.id);
}

export async function getGameSession(sessionId) {
  const session = await findGameSession(sessionId);
  if (!session) throw new NotFoundError(`no game session ${sessionId}`);

  const rows = await findGameQuestionsWithAnswers(sessionId);
  const revealAnswers = session.status === 'COMPLETED';

  return {
    sessionId: session.id,
    gameDefinitionId: session.game_definition_id,
    name: session.name,
    mechanics: session.mechanics,
    status: session.status,
    timeLimitSeconds: session.time_limit_seconds,
    totalScore: session.total_score,
    questions: rows.map((r) => ({
      questionId: r.question_id,
      topicId: r.topic_id,
      prompt: r.prompt,
      options: r.options,
      estimatedSeconds: r.estimated_seconds,
      selectedIndex: r.selected_index,
      ...(revealAnswers
        ? { correctIndex: r.answer_index, correct: r.correct, pointsAwarded: r.points_awarded, explanation: r.explanation }
        : {}),
    })),
  };
}

export async function saveGameAnswer(sessionId, { questionId, selectedIndex, timeTakenMs }) {
  if (!questionId) throw new ValidationError(['questionId is required']);
  const session = await findGameSession(sessionId);
  if (!session) throw new NotFoundError(`no game session ${sessionId}`);
  if (session.status !== 'IN_PROGRESS') throw new ValidationError(['this game has already finished']);

  await upsertGameAnswer({ sessionId, questionId, selectedIndex: selectedIndex ?? null, timeTakenMs: timeTakenMs ?? null });
  return { saved: true };
}

export async function submitGame(sessionId, learnerId) {
  const session = await findGameSession(sessionId);
  if (!session) throw new NotFoundError(`no game session ${sessionId}`);
  if (session.status !== 'IN_PROGRESS') throw new ValidationError(['this game has already finished']);

  const rows = await findGameQuestionsWithAnswers(sessionId);

  const client = await pool.connect();
  let scored;
  try {
    await client.query('BEGIN');

    const graded = [];
    for (const r of rows) {
      const answered = r.selected_index !== null && r.selected_index !== undefined;
      let correct = false;
      if (answered) {
        const result = await recordAttempt({
          client,
          learnerId,
          questionId: r.question_id,
          attemptId: crypto.randomUUID(),
          selectedIndex: r.selected_index,
          timeTakenMs: r.time_taken_ms ?? 0,
          confidence: null,
          mode: 'GAME',
        });
        correct = result.correct;
      }
      graded.push({
        questionId: r.question_id,
        correct,
        timeTakenMs: r.time_taken_ms ?? 0,
        estimatedSeconds: r.estimated_seconds,
      });
    }

    scored = scoreGameSession(graded);
    for (const q of scored.perQuestion) {
      await markGameAttemptScored({ sessionId, questionId: q.questionId, correct: q.correct, points: q.points }, client);
    }
    await completeGameSession(sessionId, scored.totalScore, client);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  return { sessionId, totalScore: scored.totalScore, correctCount: scored.correctCount, questionCount: scored.questionCount };
}
