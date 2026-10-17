import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { examWeight, selectTopic, weakestPrerequisite } from '../../../../domain/selection.mjs';
import { buildDailyPlan } from '../../../../domain/planner.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/plan/today
 *
 * The "Next Best Action": one recommendation for what she should do right
 * now, built from revision urgency, exam-weighted topic priority and the
 * prerequisite graph. The frontend renders this; it decides nothing.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const [{ rows: chapters }, { rows: topics }, { rows: states }, { rows: edges }, { rows: withContent }, { rows: dueCountRows }] =
      await Promise.all([
        query(
          `SELECT c.id AS chapter_id, c.question_count, COUNT(t.id)::int AS topic_count
             FROM chapter c JOIN topic t ON t.chapter_id = c.id
            GROUP BY c.id, c.question_count`
        ),
        query(`SELECT id, name, chapter_id FROM topic`),
        query(
          `SELECT topic_id, accuracy_score::float8 AS accuracy, attempt_count
             FROM learner_topic_state WHERE learner_id = $1`,
          [learnerId]
        ),
        query(
          `SELECT topic_id, prerequisite_topic_id, strength::float8 AS strength FROM topic_prerequisite`
        ),
        query(`SELECT DISTINCT topic_id FROM question WHERE status = 'PUBLISHED'`),
        query(
          `SELECT COUNT(*)::int AS n FROM revision_schedule WHERE learner_id = $1 AND scheduled_at <= now()`,
          [learnerId]
        ),
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
    const revisionDueCount = dueCountRows[0]?.n ?? 0;

    const plan = buildDailyPlan({ topics: candidates, revisionDueCount, selectedTopic });

    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ code: 'PLAN_FAILED', message: err.message }, { status: 500 });
  }
}
