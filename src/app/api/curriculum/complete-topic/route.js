import { NextResponse } from 'next/server';
import { pool, recordEvent } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/curriculum/complete-topic
 * body: { topicId, completed }
 *
 * The lesson-complete checkbox in the Android Course modal
 * (CourseModal.tsx) used to be entirely local state -- onToggleLesson
 * never called the backend at all, so checking a lesson "done" was lost on
 * the next reload and never touched real progress, mastery, or XP (which
 * itself is derived from real curriculum progress on every load -- see
 * mapProfile -- not a stored counter, so there was nothing durable to bump
 * in the first place).
 *
 * `lessonId` in that flow is actually a topic_id (course.lessons[].id
 * comes straight from /api/courses' chapter.lessons[].id, see that
 * route). Sibling to /api/curriculum/complete-chapter: same deliberate
 * bypass of the sequential adaptive gate, scoped to one topic instead of
 * a whole chapter. Unlike complete-chapter, this is a true two-way toggle
 * (the UI lets a learner un-check a lesson), so completed=false resets
 * progress to NOT_STARTED rather than deleting history.
 */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* empty body is invalid below */ }
  const topicId = body.topicId;
  const completed = body.completed;
  if (!topicId || typeof topicId !== 'string') {
    return NextResponse.json({ code: 'MISSING_TOPIC_ID', message: 'topicId is required' }, { status: 400 });
  }
  if (typeof completed !== 'boolean') {
    return NextResponse.json({ code: 'MISSING_COMPLETED', message: 'completed (boolean) is required' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: topicRows } = await client.query('SELECT id FROM topic WHERE id = $1', [topicId]);
    if (!topicRows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ code: 'TOPIC_NOT_FOUND', message: `No topic ${topicId}` }, { status: 404 });
    }

    const { rows: units } = await client.query('SELECT id FROM learning_unit WHERE topic_id = $1', [topicId]);
    if (!units.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ code: 'NO_UNITS', message: 'This topic has no learning units yet' }, { status: 409 });
    }

    if (completed) {
      for (const { id } of units) {
        await client.query(
          `INSERT INTO learner_unit_progress (learner_id, unit_id, status, attempts, started_at, completed_at, updated_at)
           VALUES ($1, $2, 'COMPLETED', 1, now(), now(), now())
           ON CONFLICT (learner_id, unit_id) DO UPDATE SET
             status = 'COMPLETED',
             completed_at = COALESCE(learner_unit_progress.completed_at, now()),
             updated_at = now()`,
          [learnerId, id]
        );
      }
    } else {
      await client.query(
        `UPDATE learner_unit_progress SET status = 'NOT_STARTED', completed_at = NULL, updated_at = now()
         WHERE learner_id = $1 AND unit_id = ANY($2::text[])`,
        [learnerId, units.map((u) => u.id)]
      );
    }

    await client.query('COMMIT');
    await recordEvent(learnerId, completed ? 'LESSON_MANUALLY_COMPLETED' : 'LESSON_MANUALLY_UNCOMPLETED', topicId, { unitCount: units.length });
    return NextResponse.json({ topicId, completed, unitCount: units.length });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ code: 'COMPLETE_TOPIC_FAILED', message: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
