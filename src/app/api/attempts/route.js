import { NextResponse } from 'next/server';
import { pool, recordEvent } from '../../../lib/db.mjs';
import { requireLearnerId } from '../../../lib/auth.mjs';
import { recordAttempt, RecordAttemptError } from '../../../lib/attempts.mjs';
import { checkAndUnlockAchievements } from '../../../lib/achievements.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/attempts
 * body: { attemptId, questionId, selectedIndex, timeTakenMs, confidence, mode }
 *
 * Grades the answer, classifies the mistake, updates the learner model and
 * returns what to do next. Every decision is made here, never on the client.
 *
 * attemptId is supplied by the client so a retry cannot double-count.
 * mode is 'PRACTICE' (default) or 'REVISION' — REVISION attempts are what
 * advance the spaced-repetition schedule; PRACTICE ones never do. The
 * grading pipeline itself lives in src/lib/attempts.mjs, shared with the
 * weekly test's submit step.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const { attemptId, questionId, selectedIndex, timeTakenMs, confidence = null, mode = 'PRACTICE' } = body;

  if (!attemptId || !questionId || typeof timeTakenMs !== 'number') {
    return NextResponse.json(
      { code: 'MISSING_FIELDS', message: 'attemptId, questionId and timeTakenMs are required' },
      { status: 400 }
    );
  }

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await recordAttempt({
      client,
      learnerId,
      questionId,
      attemptId,
      selectedIndex,
      timeTakenMs,
      confidence,
      mode,
    });
    await client.query('COMMIT');

    if (!result.duplicate) {
      await recordEvent(learnerId, 'QUESTION_ANSWERED', result.topicId, {
        questionId,
        correct: result.correct,
        mistakeType: result.mistakeType,
        timeTakenMs,
        mode,
      });
    }

    const newAchievements = result.duplicate ? [] : await checkAndUnlockAchievements(learnerId).catch(() => []);

    const { topicId, ...response } = result;
    return NextResponse.json({ ...response, newAchievements });
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
