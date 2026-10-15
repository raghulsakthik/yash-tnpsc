import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { pool, query, LEARNER_ID } from '../../../../lib/db.mjs';
import { recordAttempt, RecordAttemptError } from '../../../../lib/attempts.mjs';
import { selectQuestion } from '../../../../domain/selection.mjs';
import { difficultyBand } from '../../../../domain/difficulty.mjs';
import { QUICK_LAB_MODES, nextCombo } from '../../../../domain/quickLab.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quick-lab/attempt
 * body: { sessionId, questionId, selectedIndex, timeTakenMs }
 *
 * Grades the answer through the exact same shared pipeline Practice and
 * Tests use (mode 'QUICK_LAB' — recordAttempt only ever branches on
 * 'REVISION', so this is handled identically to a PRACTICE attempt: it
 * updates accuracy, difficulty and mastery, same as any other answer).
 * Then updates the round's own combo/total tracking and either returns the
 * next question or closes the round out.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_BODY', message: 'Expected a JSON body' }, { status: 400 });
  }

  const { sessionId, questionId, selectedIndex, timeTakenMs } = body;
  if (!sessionId || !questionId || typeof timeTakenMs !== 'number') {
    return NextResponse.json(
      { code: 'MISSING_FIELDS', message: 'sessionId, questionId and timeTakenMs are required' },
      { status: 400 }
    );
  }

  const { rows: sessionRows } = await query(
    `SELECT id, mode, topic_id, status, question_count, correct_count, current_combo, best_combo, total_time_ms
       FROM quick_lab_session WHERE id = $1 AND learner_id = $2`,
    [sessionId, LEARNER_ID]
  );
  if (sessionRows.length === 0) {
    return NextResponse.json({ code: 'SESSION_NOT_FOUND', message: `No Quick Lab session ${sessionId}` }, { status: 404 });
  }
  const session = sessionRows[0];
  if (session.status !== 'IN_PROGRESS') {
    return NextResponse.json({ code: 'SESSION_COMPLETED', message: 'This round has already finished' }, { status: 409 });
  }
  const mode = QUICK_LAB_MODES[session.mode];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await recordAttempt({
      client,
      learnerId: LEARNER_ID,
      questionId,
      attemptId: crypto.randomUUID(),
      selectedIndex,
      timeTakenMs,
      confidence: null,
      mode: 'QUICK_LAB',
    });
    await client.query('COMMIT');

    const questionCount = session.question_count + 1;
    const correctCount = session.correct_count + (result.correct ? 1 : 0);
    const currentCombo = nextCombo(result.correct, session.current_combo);
    const bestCombo = Math.max(session.best_combo, currentCombo);
    const totalTimeMs = Number(session.total_time_ms) + timeTakenMs;
    const done = questionCount >= mode.roundLength;

    await query(
      `UPDATE quick_lab_session
          SET question_count = $1, correct_count = $2, current_combo = $3, best_combo = $4,
              total_time_ms = $5, status = $6, completed_at = $7
        WHERE id = $8`,
      [questionCount, correctCount, currentCombo, bestCombo, totalTimeMs, done ? 'COMPLETED' : 'IN_PROGRESS', done ? new Date() : null, sessionId]
    );

    const response = {
      correct: result.correct,
      correctIndex: result.correctIndex,
      explanation: result.explanation,
      trap: result.trap,
      combo: currentCombo,
      done,
    };

    if (!done) {
      const { rows: candidates } = await query(
        `SELECT q.id, q.prompt, q.options, q.difficulty::float8 AS difficulty, q.estimated_seconds, q.source,
                COUNT(a.id)::int AS seen_count,
                COALESCE(
                  (SELECT COUNT(*) FROM question_attempt a2
                    WHERE a2.learner_id = $1 AND a2.topic_id = $2
                      AND a2.created_at > MAX(a.created_at)), 999
                )::int AS attempts_since_last_seen
           FROM question q
           LEFT JOIN question_attempt a ON a.question_id = q.id AND a.learner_id = $1
          WHERE q.topic_id = $2 AND q.status = 'PUBLISHED'
          GROUP BY q.id`,
        [LEARNER_ID, session.topic_id]
      );
      const chosen = selectQuestion(
        candidates.map((c) => ({ ...c, seenCount: c.seen_count, attemptsSinceLastSeen: c.attempts_since_last_seen })),
        result.state?.difficulty ?? 0.3
      );
      response.nextQuestion = {
        questionId: chosen.id,
        topicId: session.topic_id,
        prompt: chosen.prompt,
        options: chosen.options,
        difficulty: difficultyBand(chosen.difficulty),
      };
    }

    return NextResponse.json(response);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err instanceof RecordAttemptError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'QUICK_LAB_ATTEMPT_FAILED', message: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
