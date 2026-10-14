import { weightedAccuracy, speedScore } from '../domain/accuracy.mjs';
import { adaptDifficulty } from '../domain/difficulty.mjs';
import { classifyMistake, interventionFor } from '../domain/mistakes.mjs';
import { conceptScore, consistencyScore, confidenceCalibration, masteryScore } from '../domain/mastery.mjs';
import { recallPerformance, nextInterval, retentionValue } from '../domain/revision.mjs';

const RECENT_WINDOW = 20;

export class RecordAttemptError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Grades an answer, classifies the mistake, and updates the full learner
 * model: accuracy/speed, the six mastery dimensions, difficulty adaptation
 * and the revision schedule. This is the one place that pipeline runs —
 * used once per answer by POST /api/attempts, and once per question inside
 * the weekly test's submit transaction.
 *
 * Caller owns the transaction (BEGIN/COMMIT/ROLLBACK): a single practice
 * attempt is one transaction, but a test submission runs this 20-25 times
 * inside one transaction so the whole test scores atomically.
 *
 * @param {object} input
 * @param {import('pg').PoolClient} input.client an already-connected client, inside a transaction
 * @param {string} input.learnerId
 * @param {string} input.questionId
 * @param {string} input.attemptId client- or server-generated, for idempotency
 * @param {number|null} input.selectedIndex
 * @param {number} input.timeTakenMs
 * @param {number|null} [input.confidence] 1..5
 * @param {'PRACTICE'|'REVISION'|'TEST'} [input.mode]
 * @returns {Promise<object>} the same shape POST /api/attempts returns, plus `duplicate` when the attemptId was already recorded
 */
export async function recordAttempt({
  client,
  learnerId,
  questionId,
  attemptId,
  selectedIndex,
  timeTakenMs,
  confidence = null,
  mode = 'PRACTICE',
}) {
  const { rows: questionRows } = await client.query(
    `SELECT id, topic_id, answer_index, options, explanation, trap, estimated_seconds
       FROM question WHERE id = $1`,
    [questionId]
  );
  if (questionRows.length === 0) {
    throw new RecordAttemptError('QUESTION_NOT_FOUND', `No question ${questionId}`);
  }

  const question = questionRows[0];
  const topicId = question.topic_id;
  const correct = selectedIndex === question.answer_index;

  // State as it stood before this attempt — the mistake classifier needs the
  // learner's prior accuracy, not the one this answer is about to change.
  const { rows: priorRows } = await client.query(
    `SELECT accuracy_score::float8 AS accuracy, consecutive_wrong, attempt_count, correct_count,
            current_difficulty::float8 AS current_difficulty, retention_score::float8 AS retention_score
       FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, topicId]
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

  // ON CONFLICT DO NOTHING makes a resubmitted attempt a no-op.
  const insert = await client.query(
    `INSERT INTO question_attempt
       (id, learner_id, question_id, topic_id, selected_index, correct, time_taken_ms, confidence, mistake_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO NOTHING`,
    [attemptId, learnerId, questionId, topicId, selectedIndex ?? null, correct, timeTakenMs, confidence, mistakeType]
  );
  const isDuplicate = insert.rowCount === 0;

  if (isDuplicate) {
    return {
      correct,
      correctIndex: question.answer_index,
      explanation: question.explanation,
      trap: correct ? null : question.trap,
      mistakeType,
      intervention: mistakeType ? interventionFor(mistakeType) : null,
      duplicate: true,
      nextAction: 'PRACTICE',
      reason: 'this attempt was already recorded',
    };
  }

  // Recompute from the attempt history rather than nudging a running total,
  // so the model can never drift away from what actually happened.
  const { rows: recent } = await client.query(
    `SELECT a.correct, a.time_taken_ms, a.confidence, q.estimated_seconds
       FROM question_attempt a
       JOIN question q ON q.id = a.question_id
      WHERE a.learner_id = $1 AND a.topic_id = $2
      ORDER BY a.created_at DESC
      LIMIT $3`,
    [learnerId, topicId, RECENT_WINDOW]
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

  // Spaced repetition. First-ever attempt on a topic establishes the
  // baseline; a REVISION-mode attempt is what advances it. PRACTICE and
  // TEST attempts never touch the schedule once it exists.
  const { rows: scheduleRows } = await client.query(
    `SELECT interval_days::float8 AS interval_days
       FROM revision_schedule WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, topicId]
  );

  let retentionScore = Number(prior.retention_score);
  let performance = null;

  if (scheduleRows.length === 0) {
    await client.query(
      `INSERT INTO revision_schedule (learner_id, topic_id, scheduled_at, interval_days, status)
       VALUES ($1, $2, now() + INTERVAL '1 day', 1, 'SCHEDULED')`,
      [learnerId, topicId]
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
          SET interval_days = $1,
              scheduled_at  = now() + ($2::float8 * INTERVAL '1 day'),
              updated_at    = now()
        WHERE learner_id = $3 AND topic_id = $4`,
      [interval, interval, learnerId, topicId]
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
       accuracy_score     = EXCLUDED.accuracy_score,
       speed_score        = EXCLUDED.speed_score,
       current_difficulty = EXCLUDED.current_difficulty,
       attempt_count      = learner_topic_state.attempt_count + 1,
       correct_count      = learner_topic_state.correct_count + $6,
       consecutive_wrong  = EXCLUDED.consecutive_wrong,
       next_action        = EXCLUDED.next_action,
       last_studied_at    = now(),
       updated_at         = now(),
       concept_score      = EXCLUDED.concept_score,
       consistency_score  = EXCLUDED.consistency_score,
       confidence_score   = EXCLUDED.confidence_score,
       retention_score    = EXCLUDED.retention_score,
       mastery_score      = EXCLUDED.mastery_score`,
    [
      learnerId,
      topicId,
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

  return {
    correct,
    correctIndex: question.answer_index,
    explanation: question.explanation,
    trap: correct ? null : question.trap,
    mistakeType,
    intervention: mistakeType ? interventionFor(mistakeType) : null,
    topicId,
    performance,
    state: {
      accuracy: Number(accuracy.toFixed(3)),
      speed: Number(speed.toFixed(3)),
      difficulty: adaptation.difficulty,
      attemptCount,
      mastery: Number(mastery.toFixed(3)),
      concept: Number(concept.toFixed(3)),
      consistency: Number(consistency.toFixed(3)),
      confidence: Number(confidenceCalib.toFixed(3)),
      retention: Number(retentionScore.toFixed(3)),
    },
    nextAction: adaptation.nextAction,
    reason: adaptation.reason,
  };
}
