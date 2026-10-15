import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../lib/db.mjs';
import { masteryState } from '../../../domain/mastery.mjs';
import { computeStreak } from '../../../domain/streak.mjs';
import { MILESTONE_DEFINITIONS } from '../../../domain/milestones.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/milestones
 *
 * Computes every definition's isEarned() against current aggregates; any
 * true one with no learner_milestone row yet gets one inserted now
 * (earned_at = first time observed true — the only honest date available).
 */
export async function GET() {
  try {
    const [
      { rows: states },
      { rows: bankCounts },
      { rows: attemptDays },
      { rows: testRows },
      { rows: pyqRows },
      { rows: quickLabRows },
      { rows: earnedRows },
    ] = await Promise.all([
      query(
        `SELECT topic_id, mastery_score::float8 AS mastery, attempt_count, retention_score::float8 AS retention
           FROM learner_topic_state WHERE learner_id = $1`,
        [LEARNER_ID]
      ),
      query(`SELECT topic_id, COUNT(*)::int AS n FROM question WHERE status = 'PUBLISHED' GROUP BY topic_id`),
      query(`SELECT created_at FROM question_attempt WHERE learner_id = $1`, [LEARNER_ID]),
      query(
        `SELECT COUNT(*)::int AS n, MAX(score)::float8 AS best FROM test WHERE learner_id = $1 AND status = 'COMPLETED'`,
        [LEARNER_ID]
      ),
      query(
        `SELECT COUNT(*)::int AS n FROM question_attempt qa JOIN question q ON q.id = qa.question_id
          WHERE qa.learner_id = $1 AND q.source LIKE 'tnpsc-%'`,
        [LEARNER_ID]
      ),
      query(
        `SELECT COALESCE(SUM(question_count), 0)::int AS n FROM quick_lab_session
          WHERE learner_id = $1 AND status = 'COMPLETED'`,
        [LEARNER_ID]
      ),
      query(`SELECT milestone_id, earned_at FROM learner_milestone WHERE learner_id = $1`, [LEARNER_ID]),
    ]);

    const bankCountByTopic = new Map(bankCounts.map((b) => [b.topic_id, b.n]));
    const topicsMastered = states.filter(
      (s) => masteryState(s.mastery, s.attempt_count, bankCountByTopic.get(s.topic_id) ?? 0) === 'MASTERED'
    ).length;
    const topicsRetained = states.filter(
      (s) =>
        masteryState(s.mastery, s.attempt_count, bankCountByTopic.get(s.topic_id) ?? 0) === 'MASTERED' &&
        s.retention >= 0.8
    ).length;
    const streak = computeStreak(attemptDays.map((a) => a.created_at));

    const aggregates = {
      attemptCount: attemptDays.length,
      topicsMastered,
      topicsRetained,
      longestStreak: streak.longest,
      completedTests: testRows[0]?.n ?? 0,
      highestTestScorePct: testRows[0]?.best != null ? Math.round(testRows[0].best) : 0,
      pyqsAttempted: pyqRows[0]?.n ?? 0,
      quickLabQuestionsAnswered: quickLabRows[0]?.n ?? 0,
    };

    const earnedAtById = new Map(earnedRows.map((r) => [r.milestone_id, r.earned_at]));
    const newlyEarned = [];
    const items = MILESTONE_DEFINITIONS.map((def) => {
      const earned = def.isEarned(aggregates);
      let earnedAt = earnedAtById.get(def.id) ?? null;
      if (earned && !earnedAt) {
        earnedAt = new Date().toISOString();
        newlyEarned.push({ milestoneId: def.id, earnedAt });
      }
      return {
        id: def.id,
        name: def.name,
        note: def.note,
        earned,
        earnedAt,
        progressPct: Math.round(def.progress(aggregates) * 100),
      };
    });

    if (newlyEarned.length > 0) {
      await Promise.all(
        newlyEarned.map((m) =>
          query(
            `INSERT INTO learner_milestone (learner_id, milestone_id, earned_at) VALUES ($1, $2, $3)
             ON CONFLICT (learner_id, milestone_id) DO NOTHING`,
            [LEARNER_ID, m.milestoneId, m.earnedAt]
          )
        )
      );
    }

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ code: 'MILESTONES_FAILED', message: err.message }, { status: 500 });
  }
}
