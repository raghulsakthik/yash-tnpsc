import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tests/:id/answers
 * body: { questionId, selectedIndex, timeTakenMs, markedForReview }
 *
 * Upserts one answer. No correctness is returned — exam realism, nothing is
 * revealed until the whole test is submitted.
 */
export async function POST(request, { params }) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
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

  try {
    const { rows: testRows } = await query(`SELECT status FROM test WHERE id = $1 AND learner_id = $2`, [id, learnerId]);
    if (testRows.length === 0) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: `No test ${id}` }, { status: 404 });
    }
    if (testRows[0].status !== 'IN_PROGRESS') {
      return NextResponse.json({ code: 'TEST_COMPLETED', message: 'This test has already been submitted' }, { status: 409 });
    }
    const { rows: questionRows } = await query(`SELECT 1 FROM test_question WHERE test_id=$1 AND question_id=$2`, [id, questionId]);
    if (questionRows.length === 0) return NextResponse.json({ code: 'QUESTION_NOT_IN_TEST', message: 'Question does not belong to this test' }, { status: 400 });

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
  } catch (err) {
    // Covers malformed ids too: "id" is a uuid column, so a non-uuid string
    // throws at the database rather than returning zero rows.
    return NextResponse.json({ code: 'TEST_NOT_FOUND', message: `No test ${id}` }, { status: 404 });
  }
}
