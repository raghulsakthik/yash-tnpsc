import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tests/:id/answers
 * body: { questionId, selectedIndex, timeTakenMs, markedForReview }
 *
 * Upserts one answer. No correctness is returned — exam realism, nothing is
 * revealed until the whole test is submitted.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const { questionId, selectedIndex = null, timeTakenMs = null, markedForReview = false } = body;
  if (!questionId) {
    return NextResponse.json({ code: 'MISSING_FIELDS', message: 'questionId is required' }, { status: 400 });
  }

  const { rows: testRows } = await query(`SELECT status FROM test WHERE id = $1`, [id]);
  if (testRows.length === 0) {
    return NextResponse.json({ code: 'TEST_NOT_FOUND', message: `No test ${id}` }, { status: 404 });
  }
  if (testRows[0].status !== 'IN_PROGRESS') {
    return NextResponse.json({ code: 'TEST_COMPLETED', message: 'This test has already been submitted' }, { status: 409 });
  }

  await query(
    `INSERT INTO test_answer (test_id, question_id, selected_index, marked_for_review, time_taken_ms, answered_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (test_id, question_id) DO UPDATE SET
       selected_index    = EXCLUDED.selected_index,
       marked_for_review = EXCLUDED.marked_for_review,
       time_taken_ms     = EXCLUDED.time_taken_ms,
       answered_at       = now()`,
    [id, questionId, selectedIndex, markedForReview, timeTakenMs]
  );

  return NextResponse.json({ saved: true });
}
