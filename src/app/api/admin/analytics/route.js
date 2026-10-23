import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireAdmin } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics
 *
 * Real platform-wide numbers for the admin dashboard -- content volume,
 * account counts, and aggregate attempt/accuracy stats across every real
 * learner account (never just the one this dev instance happens to seed).
 */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  }

  try {
    const [
      { rows: accountCounts },
      { rows: contentCounts },
      { rows: attemptStats },
      { rows: testStats },
      { rows: topicCoverage },
      { rows: recentActivity },
    ] = await Promise.all([
      query(`SELECT role, COUNT(*)::int AS n FROM app_user GROUP BY role`),
      query(`SELECT
               (SELECT COUNT(*)::int FROM subject) AS subjects,
               (SELECT COUNT(*)::int FROM chapter) AS chapters,
               (SELECT COUNT(*)::int FROM topic) AS topics,
               (SELECT COUNT(*)::int FROM question WHERE status = 'PUBLISHED') AS published_questions`),
      query(`SELECT
               COUNT(*)::int AS total_attempts,
               COUNT(*) FILTER (WHERE correct)::int AS correct_attempts
             FROM question_attempt`),
      query(`SELECT COUNT(*)::int AS n FROM test WHERE status = 'COMPLETED'`),
      query(`SELECT COUNT(DISTINCT topic_id)::int AS n FROM question`),
      query(
        `SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS day, COUNT(*)::int AS n
           FROM question_attempt
          WHERE created_at >= now() - interval '7 days'
          GROUP BY day
          ORDER BY day`
      ),
    ]);

    const roleCounts = Object.fromEntries(accountCounts.map((r) => [r.role, r.n]));
    const attempts = attemptStats[0];

    return NextResponse.json({
      accounts: {
        learners: roleCounts.STUDENT ?? 0,
        test: 0,
        admins: (roleCounts.ADMIN ?? 0) + (roleCounts.SUPER_ADMIN ?? 0),
      },
      content: {
        subjects: contentCounts[0].subjects,
        chapters: contentCounts[0].chapters,
        topics: contentCounts[0].topics,
        topicsWithContent: topicCoverage[0].n,
        publishedQuestions: contentCounts[0].published_questions,
      },
      engagement: {
        totalAttempts: attempts.total_attempts,
        correctAttempts: attempts.correct_attempts,
        overallAccuracy: attempts.total_attempts > 0 ? Math.round((attempts.correct_attempts / attempts.total_attempts) * 100) : 0,
        testsCompleted: testStats[0].n,
      },
      last7Days: recentActivity.map((r) => ({ date: r.day, count: r.n })),
    });
  } catch (err) {
    return NextResponse.json({ code: 'ANALYTICS_FAILED', message: err.message }, { status: 500 });
  }
}
