import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pyqs/stats
 *
 * Real counts only -- how many actual past-year questions exist (by year,
 * by topic), and this learner's real attempt/accuracy history against
 * just that subset. No fabricated "what keeps coming back" ranking or
 * invented year totals.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const [{ rows: byYear }, { rows: byTopic }, { rows: totals }] = await Promise.all([
      query(
        `SELECT q.source_year AS year, q.exam_code, q.exam_group, q.paper, COUNT(*)::int AS total,
                COUNT(DISTINCT qa.question_id)::int AS attempted
           FROM question q
           LEFT JOIN question_attempt qa ON qa.question_id = q.id AND qa.learner_id = $1
          WHERE q.status = 'PUBLISHED' AND q.source_year IS NOT NULL
          GROUP BY q.source_year, q.exam_code, q.exam_group, q.paper
          ORDER BY q.source_year DESC`,
        [learnerId]
      ),
      query(
        `SELECT q.topic_id, t.name AS topic_name, COUNT(*)::int AS total,
                COUNT(qa.id)::int AS attempted,
                COUNT(qa.id) FILTER (WHERE qa.correct)::int AS correct
           FROM question q
           JOIN topic t ON t.id = q.topic_id
           LEFT JOIN question_attempt qa ON qa.question_id = q.id AND qa.learner_id = $1
          WHERE q.status = 'PUBLISHED' AND q.source_year IS NOT NULL
          GROUP BY q.topic_id, t.name
          ORDER BY total DESC`,
        [learnerId]
      ),
      query(
        `SELECT COUNT(*)::int AS attempted, COUNT(*) FILTER (WHERE qa.correct)::int AS correct
           FROM question_attempt qa
           JOIN question q ON q.id = qa.question_id
          WHERE qa.learner_id = $1 AND q.source_year IS NOT NULL`,
        [learnerId]
      ),
    ]);

    const t = totals[0] ?? { attempted: 0, correct: 0 };

    return NextResponse.json({
      totalQuestions: byTopic.reduce((sum, r) => sum + r.total, 0),
      attempted: t.attempted,
      accuracy: t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : null,
      byYear: byYear.map((r) => ({ year: r.year, examCode: r.exam_code, examGroup: r.exam_group, paper: r.paper, total: r.total, attempted: r.attempted })),
      byTopic: byTopic.map((r) => ({
        topicId: r.topic_id,
        topicName: r.topic_name,
        total: r.total,
        attempted: r.attempted,
        correct: r.correct,
        accuracy: r.attempted > 0 ? Math.round((r.correct / r.attempted) * 100) : null,
      })),
    });
  } catch (err) {
    return NextResponse.json({ code: 'PYQ_STATS_FAILED', message: err.message }, { status: 500 });
  }
}
