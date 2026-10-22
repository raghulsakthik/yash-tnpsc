import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/progress/calendar?month=YYYY-MM
 *
 * Real questions-answered-per-day for every day of the given month
 * (defaults to the current month), zero-filled -- the data behind the
 * Home page's login/activity calendar. Defaults to today's month if the
 * param is missing or malformed.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month');
  const now = new Date();
  const [year, month] = /^\d{4}-\d{2}$/.test(monthParam ?? '')
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  // Month boundaries as real instants, computed in IST -- not plain UTC
  // month edges, which would clip the first ~5.5 hours of IST day 1 (that
  // window is still the previous UTC day) and leak the last ~5.5 hours of
  // IST day 1 of next month in.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - IST_OFFSET_MS);
  const monthEnd = new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS);
  const daysInMonth = new Date(year, month, 0).getDate();

  try {
    const { rows } = await query(
      `SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS day, COUNT(*)::int AS n
         FROM question_attempt
        WHERE learner_id = $1 AND created_at >= $2 AND created_at < $3
        GROUP BY day`,
      [learnerId, monthStart.toISOString(), monthEnd.toISOString()]
    );

    const countByDay = new Map(rows.map((r) => [r.day, r.n]));

    const days = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: key, count: countByDay.get(key) ?? 0 });
    }

    return NextResponse.json({ year, month, days });
  } catch (err) {
    return NextResponse.json({ code: 'CALENDAR_FAILED', message: err.message }, { status: 500 });
  }
}
