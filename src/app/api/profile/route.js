import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';
import { getSession } from '../../../lib/auth.mjs';
import { computeStreak, longestStreak } from '../../../domain/progress.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile
 *
 * Learner identity, preferences and real totals/streak — no fabricated
 * stats. "Total learning minutes" is omitted: nothing tracks session
 * duration, only per-question time, so a sum of those would overstate
 * real study time (thinking time between questions isn't captured).
 */
export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }
  if (!session.learnerId) {
    // Admin accounts have no learner row -- just identity, no progress stats.
    return NextResponse.json({ name: session.email, role: session.role, email: session.email });
  }
  const learnerId = session.learnerId;

  try {
    const [{ rows: learnerRows }, { rows: profileRows }, { rows: activityRows }, { rows: totals }, { rows: masteredRows }, { rows: testRows }] =
      await Promise.all([
        query(`SELECT id, name, created_at FROM learner WHERE id = $1`, [learnerId]),
        query(`SELECT exam, language, daily_goal_minutes FROM learner_profile WHERE learner_id = $1`, [learnerId]),
        query(
          `SELECT DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS day
             FROM question_attempt WHERE learner_id = $1`,
          [learnerId]
        ),
        query(`SELECT COUNT(*)::int AS n FROM question_attempt WHERE learner_id = $1`, [learnerId]),
        query(
          `SELECT COUNT(*)::int AS n FROM learner_topic_state WHERE learner_id = $1 AND mastery_score >= 0.85`,
          [learnerId]
        ),
        query(`SELECT COUNT(*)::int AS n FROM test WHERE learner_id = $1 AND status = 'COMPLETED'`, [learnerId]),
      ]);

    if (learnerRows.length === 0) {
      return NextResponse.json({ code: 'LEARNER_NOT_FOUND', message: 'No learner configured' }, { status: 404 });
    }

    const activeDates = activityRows.map((r) => r.day);

    return NextResponse.json({
      name: learnerRows[0].name,
      role: session.role,
      email: session.email,
      since: learnerRows[0].created_at,
      exam: profileRows[0]?.exam ?? null,
      language: profileRows[0]?.language ?? 'en',
      dailyGoalMinutes: profileRows[0]?.daily_goal_minutes ?? 30,
      streak: computeStreak(activeDates),
      longestStreak: longestStreak(activeDates),
      questionsSolved: totals[0]?.n ?? 0,
      topicsMastered: masteredRows[0]?.n ?? 0,
      testsCompleted: testRows[0]?.n ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ code: 'PROFILE_FAILED', message: err.message }, { status: 500 });
  }
}
