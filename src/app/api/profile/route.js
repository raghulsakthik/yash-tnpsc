import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * The current daily streak from real attempt history: walk back day by day
 * from today (today itself doesn't break the streak if empty — she just
 * hasn't studied yet today) until a day with no activity is found.
 *
 * @param {string[]} activeDates ISO 'YYYY-MM-DD' strings, any order
 */
function computeStreak(activeDates) {
  const days = new Set(activeDates);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Today doesn't have to have activity yet for the streak to still be "alive".
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function longestStreak(activeDates) {
  const days = [...new Set(activeDates)].sort();
  let longest = 0;
  let current = 0;
  let prev = null;
  for (const day of days) {
    if (prev) {
      const gapDays = (new Date(day) - new Date(prev)) / 86_400_000;
      current = gapDays === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    prev = day;
  }
  return longest;
}

/**
 * GET /api/profile
 *
 * Learner identity, preferences and real totals/streak — no fabricated
 * stats. "Total learning minutes" is omitted: nothing tracks session
 * duration, only per-question time, so a sum of those would overstate
 * real study time (thinking time between questions isn't captured).
 */
export async function GET() {
  try {
    const [{ rows: learnerRows }, { rows: profileRows }, { rows: activityRows }, { rows: totals }, { rows: masteredRows }, { rows: testRows }] =
      await Promise.all([
        query(`SELECT id, name, created_at FROM learner WHERE id = $1`, [LEARNER_ID]),
        query(`SELECT exam, language, daily_goal_minutes FROM learner_profile WHERE learner_id = $1`, [LEARNER_ID]),
        query(
          `SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::date AS day
             FROM question_attempt WHERE learner_id = $1`,
          [LEARNER_ID]
        ),
        query(`SELECT COUNT(*)::int AS n FROM question_attempt WHERE learner_id = $1`, [LEARNER_ID]),
        query(
          `SELECT COUNT(*)::int AS n FROM learner_topic_state WHERE learner_id = $1 AND mastery_score >= 0.85`,
          [LEARNER_ID]
        ),
        query(`SELECT COUNT(*)::int AS n FROM test WHERE learner_id = $1 AND status = 'COMPLETED'`, [LEARNER_ID]),
      ]);

    if (learnerRows.length === 0) {
      return NextResponse.json({ code: 'LEARNER_NOT_FOUND', message: 'No learner configured' }, { status: 404 });
    }

    const activeDates = activityRows.map((r) => r.day.toISOString().slice(0, 10));

    return NextResponse.json({
      name: learnerRows[0].name,
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
