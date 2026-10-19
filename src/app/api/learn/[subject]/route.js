import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { topicStatus } from '../../../../domain/progress.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learn/:subject
 *
 * The subject's topics in syllabus order, each with its real status. A
 * topic is "locked" (not yet reachable) only for display purposes here —
 * nothing server-side actually blocks practising it, this just mirrors the
 * chapter/topic ordering so the path reads top to bottom.
 */
export async function GET(request, { params }) {
  const { subject } = await params;

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const { rows: subjectRows } = await query(`SELECT id, name FROM subject WHERE id = $1`, [subject]);
    if (subjectRows.length === 0) {
      return NextResponse.json({ code: 'SUBJECT_NOT_FOUND', message: `No subject ${subject}` }, { status: 404 });
    }

    const { rows: topics } = await query(
      `SELECT t.id, t.name, c.sort_order AS chapter_order, t.sort_order AS topic_order
         FROM topic t JOIN chapter c ON c.id = t.chapter_id
        WHERE c.subject_id = $1
        ORDER BY c.sort_order, t.sort_order`,
      [subject]
    );

    const { rows: states } = await query(
      `SELECT lts.topic_id, lts.attempt_count, lts.mastery_score::float8 AS mastery_score,
              rs.scheduled_at <= now() AS revision_due, rs.interval_days::float8 AS interval_days
         FROM learner_topic_state lts
         LEFT JOIN revision_schedule rs ON rs.learner_id = lts.learner_id AND rs.topic_id = lts.topic_id
        WHERE lts.learner_id = $1`,
      [learnerId]
    );
    const stateByTopic = new Map(states.map((s) => [s.topic_id, s]));

    const result = topics.map((t, i) => {
      const state = stateByTopic.get(t.id);
      const attemptCount = state?.attempt_count ?? 0;
      const mastery = state?.mastery_score ?? 0;
      const status = topicStatus({
        attemptCount,
        masteryScore: mastery,
        revisionDue: Boolean(state?.revision_due),
        intervalDays: state?.interval_days ?? null,
      });
      return {
        n: i + 1,
        slug: t.id,
        name: t.name,
        state: status,
        mastery: Math.round(mastery * 100),
        attemptCount,
      };
    });

    return NextResponse.json({ slug: subject, name: subjectRows[0].name, topics: result });
  } catch (err) {
    return NextResponse.json({ code: 'SUBJECT_FAILED', message: err.message }, { status: 500 });
  }
}
