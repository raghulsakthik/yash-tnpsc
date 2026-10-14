import { NextResponse } from 'next/server';
import { pool, LEARNER_ID, recordEvent } from '../../../lib/db.mjs';
import { recordAttempt, RecordAttemptError } from '../../../lib/attempts.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/attempts
 * body: { attemptId, questionId, selectedIndex, timeTakenMs, confidence, mode, hintUsed, sessionId }
 *
 * Grades the answer, classifies the mistake, updates the learner model and
 * returns what to do next. Every decision is made here, never on the client
 * — the frontend sends only the raw facts of the attempt (answer,
 * timeTaken, confidence, hintUsed); everything else (correctness, mistake
 * type, mastery, difficulty, next action) is computed here, not the client.
 *
 * attemptId is supplied by the client so a retry cannot double-count.
 * mode is 'PRACTICE' (default) or 'REVISION' — REVISION attempts are what
 * advance the spaced-repetition schedule; PRACTICE ones never do. hintUsed
 * and sessionId are optional (Phase 8) — an attempt taken outside any
 * session, or without opening a hint, is still a complete, valid attempt.
 * The grading pipeline itself lives in src/lib/attempts.mjs, shared with
 * the weekly test's and the default assessment's submit steps.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const {
    attemptId,
    questionId,
    selectedIndex,
    timeTakenMs,
    confidence = null,
    mode = 'PRACTICE',
    hintUsed = false,
    sessionId = null,
  } = body;

  if (!attemptId || !questionId || typeof timeTakenMs !== 'number') {
    return NextResponse.json(
      { code: 'MISSING_FIELDS', message: 'attemptId, questionId and timeTakenMs are required' },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await recordAttempt({
      client,
      learnerId: LEARNER_ID,
      questionId,
      attemptId,
      selectedIndex,
      timeTakenMs,
      confidence,
      mode,
      hintUsed,
      sessionId,
    });
    await client.query('COMMIT');

    if (!result.duplicate) {
      await recordEvent(LEARNER_ID, 'QUESTION_ANSWERED', result.topicId, {
        questionId,
        correct: result.correct,
        mistakeType: result.mistakeType,
        timeTakenMs,
        mode,
        hintUsed,
      });
    }

    const { topicId, ...response } = result;
    return NextResponse.json(response);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err instanceof RecordAttemptError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'ATTEMPT_FAILED', message: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
