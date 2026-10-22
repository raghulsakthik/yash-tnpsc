import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });
  const { id } = await params;
  const result = await query('DELETE FROM learner_note WHERE id=$1 AND learner_id=$2', [id, learnerId]);
  if (!result.rowCount) return NextResponse.json({ code: 'NOTE_NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
