import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/progress/day?date=YYYY-MM-DD
 *
 * What she actually studied on one real day -- the data behind the Home
 * calendar's click-to-see popup. Grouped by topic, each with real
 * attempt/correct counts for that day.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!DATE_RE.test(date ?? '')) {
    return NextResponse.json({ code: 'INVALID_DATE', message: 'date must be YYYY-MM-DD' }, { status: 400 });
  }

  try {
    const { rows } = await query(
      `SELECT t.id AS topic_id, t.name AS topic_name,
              COUNT(*)::int AS attempts,
              COUNT(*) FILTER (WHERE qa.correct)::int AS correct
         FROM question_attempt qa
         JOIN topic t ON t.id = qa.topic_id
        WHERE qa.learner_id = $1
          AND (qa.created_at AT TIME ZONE 'Asia/Kolkata')::date = $2::date
        GROUP BY t.id, t.name
        ORDER BY attempts DESC`,
      [learnerId, date]
    );

    const totalQuestions = rows.reduce((sum, r) => sum + r.attempts, 0);
    const correctCount = rows.reduce((sum, r) => sum + r.correct, 0);

    return NextResponse.json({
      date,
      totalQuestions,
      correctCount,
      topics: rows.map((r) => ({ topicId: r.topic_id, topicName: r.topic_name, attempts: r.attempts, correct: r.correct })),
    });
  } catch (err) {
    return NextResponse.json({ code: 'DAY_FAILED', message: err.message }, { status: 500 });
  }
}
