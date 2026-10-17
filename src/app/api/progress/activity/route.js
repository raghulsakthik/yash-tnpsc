import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

const DAYS = 14;

/**
 * GET /api/progress/activity
 *
 * Real questions-answered-per-day for the last 14 days (today included),
 * zero-filled for days with no activity -- the data behind the streak
 * calendar and activity bar graph. Not a mastery trend (mastery per day
 * isn't stored historically, only its current value) -- this is raw
 * volume, which is still a real, honest signal of consistency.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const { rows } = await query(
      `SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*)::int AS n
         FROM question_attempt
        WHERE learner_id = $1 AND created_at >= now() - interval '${DAYS} days'
        GROUP BY day`,
      [learnerId]
    );

    const countByDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r.n]));

    const days = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - (DAYS - 1));
    for (let i = 0; i < DAYS; i += 1) {
      const key = cursor.toISOString().slice(0, 10);
      days.push({ date: key, count: countByDay.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({ days });
  } catch (err) {
    return NextResponse.json({ code: 'ACTIVITY_FAILED', message: err.message }, { status: 500 });
  }
}
