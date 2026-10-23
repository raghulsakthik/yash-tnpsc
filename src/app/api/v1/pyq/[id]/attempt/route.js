import { NextResponse } from 'next/server';
import { pool, LEARNER_ID, recordEvent } from '../../../../../../lib/db.mjs';
import { recordAttempt, RecordAttemptError } from '../../../../../../lib/attempts.mjs';
import { getPyqQuestion } from '../../../../../../services/pyqCatalogService.mjs';
import { NotFoundError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/pyq/:id/attempt
 * body: { attemptId, selectedIndex, timeTakenMs, confidence, hintUsed, sessionId }
 *
 * A PYQ attempt is not a different kind of attempt — this delegates
 * entirely to the exact same recordAttempt() pipeline POST /api/attempts
 * already uses (Phase 1, unchanged), after confirming the id really is a
 * real, transcribed past-paper question. Every attempt here feeds the
 * learner model exactly like any other practice attempt.
 */
export async function POST(request, { params }) {
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const { attemptId, selectedIndex, timeTakenMs, confidence = null, hintUsed = false, sessionId = null } = body;
  if (!attemptId || typeof timeTakenMs !== 'number') {
    return NextResponse.json({ code: 'MISSING_FIELDS', message: 'attemptId and timeTakenMs are required' }, { status: 400 });
  }

  try {
    await getPyqQuestion(id);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'PYQ_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'PYQ_ATTEMPT_FAILED', message: err.message }, { status: 500 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await recordAttempt({
      client,
      learnerId: LEARNER_ID,
      questionId: id,
      attemptId,
      selectedIndex,
      timeTakenMs,
      confidence,
      mode: 'PRACTICE',
      hintUsed,
      sessionId,
    });
    await client.query('COMMIT');

    if (!result.duplicate) {
      await recordEvent(LEARNER_ID, 'QUESTION_ANSWERED', result.topicId, {
        questionId: id,
        correct: result.correct,
        mistakeType: result.mistakeType,
        timeTakenMs,
        mode: 'PYQ',
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
    return NextResponse.json({ code: 'PYQ_ATTEMPT_FAILED', message: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
