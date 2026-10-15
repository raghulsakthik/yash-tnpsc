import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';
import { examWeight, selectTopic, weakestPrerequisite } from '../../../../domain/selection.mjs';
import { buildDailyPlan } from '../../../../domain/planner.mjs';
import { masteryState } from '../../../../domain/mastery.mjs';
import { recommendedAction } from '../../../../domain/recommendedAction.mjs';
import { computeStreak } from '../../../../domain/streak.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/home/overview
 *
 * Home's whole view-model in one request: the Next Best Action plan plus
 * the revision-due list. An aggregation endpoint, not a replacement —
 * /api/plan/today and /api/revision/due still work standalone and run the
 * exact same queries/domain functions this does.
 */
export async function GET() {
  try {
    const [{ rows: chapters }, { rows: topics }, { rows: states }, { rows: edges }, { rows: withContent }, { rows: dueRows }, { rows: attemptDays }] =
      await Promise.all([
        query(
          `SELECT c.id AS chapter_id, c.question_count, COUNT(t.id)::int AS topic_count
             FROM chapter c JOIN topic t ON t.chapter_id = c.id
            GROUP BY c.id, c.question_count`
        ),
        query(`SELECT id, name, chapter_id FROM topic`),
        query(
          `SELECT topic_id, accuracy_score::float8 AS accuracy, attempt_count, mastery_score::float8 AS mastery
             FROM learner_topic_state WHERE learner_id = $1`,
          [LEARNER_ID]
        ),
        query(
          `SELECT topic_id, prerequisite_topic_id, strength::float8 AS strength FROM topic_prerequisite`
        ),
        query(`SELECT DISTINCT topic_id FROM question WHERE status = 'PUBLISHED'`),
        query(
          `SELECT rs.topic_id, t.name AS topic_name, rs.scheduled_at, rs.interval_days::float8 AS interval_days,
                  lts.retention_score::float8 AS retention, lts.mastery_score::float8 AS mastery, lts.attempt_count
             FROM revision_schedule rs
             JOIN topic t ON t.id = rs.topic_id
             LEFT JOIN learner_topic_state lts ON lts.learner_id = rs.learner_id AND lts.topic_id = rs.topic_id
            WHERE rs.learner_id = $1 AND rs.scheduled_at <= now()
            ORDER BY rs.scheduled_at ASC`,
          [LEARNER_ID]
        ),
        query(`SELECT created_at FROM question_attempt WHERE learner_id = $1`, [LEARNER_ID]),
      ]);

    const chapterById = new Map(chapters.map((c) => [c.chapter_id, c]));
    const maxChapterQuestionCount = Math.max(1, ...chapters.map((c) => c.question_count));

    const stateByTopic = new Map(states.map((s) => [s.topic_id, s]));
    const topicsWithContent = new Set(withContent.map((w) => w.topic_id));

    const graph = new Map();
    for (const edge of edges) {
      if (!graph.has(edge.topic_id)) graph.set(edge.topic_id, []);
      graph.get(edge.topic_id).push({ id: edge.prerequisite_topic_id, strength: edge.strength });
    }
    const accuracyByTopic = new Map(states.map((s) => [s.topic_id, s.accuracy]));

    const candidates = topics
      .filter((t) => topicsWithContent.has(t.id))
      .map((t) => {
        const chapter = chapterById.get(t.chapter_id);
        const state = stateByTopic.get(t.id);
        const weakest = weakestPrerequisite(t.id, graph, accuracyByTopic);

        return {
          id: t.id,
          name: t.name,
          accuracy: state?.accuracy ?? 0,
          attemptCount: state?.attempt_count ?? 0,
          examWeight: chapter
            ? examWeight(chapter.question_count, chapter.topic_count, maxChapterQuestionCount)
            : 0,
          prerequisiteGap: weakest ? 1 - weakest.accuracy : 0,
        };
      });

    const selectedTopic = selectTopic(candidates);
    const revisionDueCount = dueRows.length;

    const plan = buildDailyPlan({ topics: candidates, revisionDueCount, selectedTopic });

    const practiced = states.filter((s) => s.attempt_count > 0);
    const avgMasteryPct =
      practiced.length > 0
        ? Math.round((practiced.reduce((sum, s) => sum + s.mastery, 0) / practiced.length) * 100)
        : null;

    const streak = computeStreak(attemptDays.map((a) => a.created_at));

    return NextResponse.json({
      ...plan,
      avgMasteryPct,
      streak,
      dueItems: dueRows.map((r) => ({
        topicId: r.topic_id,
        topicName: r.topic_name,
        scheduledAt: r.scheduled_at,
        intervalDays: r.interval_days,
        retentionPct: Math.round((r.retention ?? 0) * 100),
        state: masteryState(r.mastery ?? 0, r.attempt_count ?? 1, 1),
        recommendedAction: recommendedAction({ revisionDue: true, started: true }),
      })),
    });
  } catch (err) {
    return NextResponse.json({ code: 'HOME_OVERVIEW_FAILED', message: err.message }, { status: 500 });
  }
}
