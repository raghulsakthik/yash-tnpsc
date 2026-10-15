import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';
import { masteryState } from '../../../../domain/mastery.mjs';
import { computeStreak } from '../../../../domain/streak.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/journey/overview
 *
 * Read-model over data that already exists: per-topic mastery tier (the
 * "orbit"/"knowledge garden" views), streaks, and personal records straight
 * from question_attempt. No "most improved topic" field — that needs a
 * historical mastery snapshot nothing here stores; omitted rather than
 * invented, same reasoning Phase 3 used to drop Home's "+9%" delta.
 */
export async function GET() {
  try {
    const [{ rows: states }, { rows: bankCounts }, { rows: attempts }, { rows: fastest }, { rows: busiestDay }, { rows: bestTest }, { rows: totals }] =
      await Promise.all([
        query(
          `SELECT topic_id, t.name AS topic_name, lts.mastery_score::float8 AS mastery, lts.attempt_count,
                  lts.retention_score::float8 AS retention
             FROM learner_topic_state lts JOIN topic t ON t.id = lts.topic_id
            WHERE lts.learner_id = $1`,
          [LEARNER_ID]
        ),
        query(`SELECT topic_id, COUNT(*)::int AS n FROM question WHERE status = 'PUBLISHED' GROUP BY topic_id`),
        query(`SELECT created_at FROM question_attempt WHERE learner_id = $1`, [LEARNER_ID]),
        query(
          `SELECT MIN(time_taken_ms)::int AS ms FROM question_attempt WHERE learner_id = $1 AND correct = true`,
          [LEARNER_ID]
        ),
        query(
          `SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS n
             FROM question_attempt WHERE learner_id = $1
            GROUP BY day ORDER BY n DESC LIMIT 1`,
          [LEARNER_ID]
        ),
        query(
          `SELECT COUNT(*)::int AS n, MAX(score)::float8 AS best FROM test WHERE learner_id = $1 AND status = 'COMPLETED'`,
          [LEARNER_ID]
        ),
        query(
          `SELECT COUNT(*)::int AS questions_solved,
                  COUNT(DISTINCT date_trunc('day', created_at))::int AS active_days,
                  MIN(created_at) AS since
             FROM question_attempt WHERE learner_id = $1`,
          [LEARNER_ID]
        ),
      ]);

    const bankCountByTopic = new Map(bankCounts.map((b) => [b.topic_id, b.n]));
    const topics = states.map((s) => ({
      topicId: s.topic_id,
      topicName: s.topic_name,
      masteryScore: s.mastery,
      attemptCount: s.attempt_count,
      retentionScore: s.retention,
      state: masteryState(s.mastery, s.attempt_count, bankCountByTopic.get(s.topic_id) ?? 0),
    }));

    const streak = computeStreak(attempts.map((a) => a.created_at));

    const mastered = topics.filter((t) => t.state === 'MASTERED');
    const bestRetained = mastered.length > 0 ? mastered.reduce((a, b) => (a.retentionScore >= b.retentionScore ? a : b)) : null;

    return NextResponse.json({
      topics,
      streak,
      questionsSolved: totals[0]?.questions_solved ?? 0,
      activeDays: totals[0]?.active_days ?? 0,
      since: totals[0]?.since ?? null,
      topicsMastered: topics.filter((t) => t.state === 'MASTERED').length,
      completedTests: bestTest[0]?.n ?? 0,
      personalRecords: {
        longestStreak: streak.longest,
        highestTestScorePct: bestTest[0]?.best != null ? Math.round(bestTest[0].best) : null,
        fastestCorrectAnswerMs: fastest[0]?.ms ?? null,
        mostQuestionsInADay: busiestDay[0]?.n ?? 0,
        bestRetainedTopic: bestRetained ? { topicId: bestRetained.topicId, topicName: bestRetained.topicName } : null,
      },
    });
  } catch (err) {
    return NextResponse.json({ code: 'JOURNEY_OVERVIEW_FAILED', message: err.message }, { status: 500 });
  }
}
