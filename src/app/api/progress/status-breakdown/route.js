import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { topicStatus } from '../../../../domain/progress.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/progress/status-breakdown
 *
 * Every topic in the syllabus, bucketed by her real status on it -- the
 * data behind the Home page's status pie chart. Same topicStatus() rule
 * /api/learn uses per-subject, just counted across the whole syllabus
 * instead of grouped by subject.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const [{ rows: topics }, { rows: states }, { rows: due }] = await Promise.all([
      query(`SELECT id FROM topic`),
      query(
        `SELECT topic_id, attempt_count, mastery_score::float8 AS mastery_score
           FROM learner_topic_state WHERE learner_id = $1`,
        [learnerId]
      ),
      query(`SELECT topic_id FROM revision_schedule WHERE learner_id = $1 AND scheduled_at <= now()`, [learnerId]),
    ]);

    const stateByTopic = new Map(states.map((s) => [s.topic_id, s]));
    const dueTopics = new Set(due.map((d) => d.topic_id));

    const counts = {};
    for (const t of topics) {
      const state = stateByTopic.get(t.id);
      const status = topicStatus({
        attemptCount: state?.attempt_count ?? 0,
        masteryScore: state?.mastery_score ?? 0,
        revisionDue: dueTopics.has(t.id),
      });
      counts[status] = (counts[status] ?? 0) + 1;
    }

    const breakdown = Object.entries(counts).map(([status, count]) => ({ status, count }));

    return NextResponse.json({ breakdown, totalTopics: topics.length });
  } catch (err) {
    return NextResponse.json({ code: 'STATUS_BREAKDOWN_FAILED', message: err.message }, { status: 500 });
  }
}
