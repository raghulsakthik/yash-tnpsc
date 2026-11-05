import { NextResponse } from 'next/server';
import { pool, recordEvent } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/curriculum/complete-chapter
 * body: { chapterId }
 *
 * The "Complete Module" shortcut on the Courses browse screen (a chapter,
 * in curriculum terms) -- an explicit learner override, not organic
 * progress. /api/curriculum/complete is the real unit-completion path, but
 * it's strictly sequential: it only ever accepts a unit on the learner's
 * CURRENT day (learner_curriculum.current_day_id) and rejects anything
 * else with UNIT_NOT_CURRENT. The Courses screen lets a learner browse
 * into any chapter, including ones ahead of where their adaptive path has
 * placed them, so this route exists as a deliberate bypass: it marks every
 * learning_unit under the chapter COMPLETED for this learner directly,
 * without touching learner_curriculum (the day/week/phase pointer stays
 * exactly where the adaptive engine left it) and without the phase-gate
 * evaluation /complete runs -- this is "give me credit for this module",
 * not "advance my sequential plan".
 */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* empty body is invalid below */ }
  const chapterId = body.chapterId;
  if (!chapterId || typeof chapterId !== 'string') {
    return NextResponse.json({ code: 'MISSING_CHAPTER_ID', message: 'chapterId is required' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: chapterRows } = await client.query('SELECT id FROM chapter WHERE id = $1', [chapterId]);
    if (!chapterRows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ code: 'CHAPTER_NOT_FOUND', message: `No chapter ${chapterId}` }, { status: 404 });
    }

    const { rows: units } = await client.query(
      `SELECT u.id FROM learning_unit u JOIN topic t ON t.id = u.topic_id WHERE t.chapter_id = $1`,
      [chapterId]
    );
    if (!units.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ code: 'NO_UNITS', message: 'This chapter has no learning units yet' }, { status: 409 });
    }

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

    await client.query('COMMIT');
    await recordEvent(learnerId, 'MODULE_MANUALLY_COMPLETED', null, { chapterId, unitCount: units.length });
    return NextResponse.json({ chapterId, completedUnits: units.length });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ code: 'COMPLETE_CHAPTER_FAILED', message: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
