import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/** DELETE /api/bookmarks/:questionId */
export async function DELETE(request, { params }) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }
  const { questionId } = await params;

  try {
    await query(`DELETE FROM question_bookmark WHERE learner_id = $1 AND question_id = $2`, [learnerId, questionId]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ code: 'UNBOOKMARK_FAILED', message: err.message }, { status: 500 });
  }
}
