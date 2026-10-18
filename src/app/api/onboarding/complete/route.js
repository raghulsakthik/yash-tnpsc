import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { recordAttempt, RecordAttemptError } from '../../../../lib/attempts.mjs';

export const dynamic = 'force-dynamic';

// The one deliberate bootstrap bias in an otherwise fully dynamic app: a
// learner's very first recommended action is always basic arithmetic
// foundations, regardless of what the placement quiz covered -- "the
// basics first" isn't something exam-weight scoring would naturally pick
// (General Studies chapters usually outweigh foundation maths), so it's
// stated here explicitly rather than hoped for from the general planner.
const FIRST_TOPIC = 'aptitude.whole-numbers';

/**
 * POST /api/onboarding/complete
 * body: {
 *   language: 'en' | 'ta',
 *   dailyGoalMinutes: number,
 *   answers: [{ questionId, selectedIndex }]   -- from the placement quiz
 * }
 *
 * Grades every placement answer through the same pipeline a real practice
 * attempt uses (mastery, difficulty, revision scheduling all update from
 * it immediately -- the placement quiz isn't a throwaway survey, it's the
 * learner's first real data), saves the stated preferences, and marks
 * onboarding done so this never runs again for this learner.
 */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const language = body.language === 'ta' ? 'ta' : 'en';
  const dailyGoalMinutes = Number.isInteger(body.dailyGoalMinutes) ? body.dailyGoalMinutes : 30;
  const answers = Array.isArray(body.answers) ? body.answers : [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let correctCount = 0;
    for (const a of answers) {
      if (!a?.questionId) continue;
      try {
        const result = await recordAttempt({
          client,
          learnerId,
          questionId: a.questionId,
          attemptId: crypto.randomUUID(),
          selectedIndex: Number.isInteger(a.selectedIndex) ? a.selectedIndex : null,
          timeTakenMs: 0,
          mode: 'PRACTICE',
        });
        if (result.correct) correctCount += 1;
      } catch (err) {
        if (!(err instanceof RecordAttemptError)) throw err;
        // A stale/unknown question id in the submitted answers shouldn't
        // fail the whole onboarding -- skip it and keep going.
      }
    }

    await client.query(
      `UPDATE learner_profile SET language = $2, daily_goal_minutes = $3, onboarded = true, updated_at = now()
       WHERE learner_id = $1`,
      [learnerId, language, dailyGoalMinutes]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      answeredCount: answers.length,
      correctCount,
      firstTopicId: FIRST_TOPIC,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ code: 'ONBOARDING_FAILED', message: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
