import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../lib/db.mjs';
import { topicStatus } from '../../../domain/progress.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learn
 *
 * Every subject with real aggregated progress: topic count, how many are
 * mastered/retained, overall mastery (mean across topics with at least one
 * attempt), and how many are due for revision right now.
 */
export async function GET() {
  try {
    const [{ rows: subjects }, { rows: topics }, { rows: states }, { rows: due }] = await Promise.all([
      query(`SELECT id, name, sort_order FROM subject ORDER BY sort_order`),
      query(
        `SELECT t.id, c.subject_id
           FROM topic t JOIN chapter c ON c.id = t.chapter_id`
      ),
      query(
        `SELECT topic_id, attempt_count, mastery_score::float8 AS mastery_score
           FROM learner_topic_state WHERE learner_id = $1`,
        [LEARNER_ID]
      ),
      query(
        `SELECT topic_id FROM revision_schedule WHERE learner_id = $1 AND scheduled_at <= now()`,
        [LEARNER_ID]
      ),
    ]);

    const stateByTopic = new Map(states.map((s) => [s.topic_id, s]));
    const dueTopics = new Set(due.map((d) => d.topic_id));
    const topicsBySubject = new Map();
    for (const t of topics) {
      if (!topicsBySubject.has(t.subject_id)) topicsBySubject.set(t.subject_id, []);
      topicsBySubject.get(t.subject_id).push(t.id);
    }

    const result = subjects.map((s) => {
      const topicIds = topicsBySubject.get(s.id) ?? [];
      let mastered = 0;
      let revisionDue = 0;
      let masterySum = 0;
      let attemptedCount = 0;

      for (const topicId of topicIds) {
        const state = stateByTopic.get(topicId);
        const attemptCount = state?.attempt_count ?? 0;
        const mastery = state?.mastery_score ?? 0;
        const status = topicStatus({ attemptCount, masteryScore: mastery, revisionDue: dueTopics.has(topicId) });
        if (status === 'mastered' || status === 'retained') mastered += 1;
        if (status === 'revision-due') revisionDue += 1;
        if (attemptCount > 0) {
          masterySum += mastery;
          attemptedCount += 1;
        }
      }

      const overallStatus =
        attemptedCount === 0
          ? 'not-started'
          : revisionDue > 0
            ? 'revision-due'
            : topicStatus({ attemptCount: 1, masteryScore: masterySum / attemptedCount, revisionDue: false });

      return {
        slug: s.id,
        name: s.name,
        topics: topicIds.length,
        mastered,
        mastery: attemptedCount > 0 ? Math.round((masterySum / attemptedCount) * 100) : 0,
        revisionDue,
        status: overallStatus,
      };
    });

    return NextResponse.json({ subjects: result });
  } catch (err) {
    return NextResponse.json({ code: 'LEARN_FAILED', message: err.message }, { status: 500 });
  }
}
