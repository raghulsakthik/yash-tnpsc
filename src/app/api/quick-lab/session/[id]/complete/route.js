import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quick-lab/session/:id/complete
 *
 * The timeout path: the client-side clock ran out before roundLength
 * questions were answered. Closes the round out as-is — whatever was
 * recorded already stands, same as the weekly test's "nothing revealed
 * until submit" closing a test early never discards answered questions.
 */
export async function POST(request, { params }) {
  const { id } = await params;

  const { rows } = await query(
    `UPDATE quick_lab_session
        SET status = 'COMPLETED', completed_at = now()
      WHERE id = $1 AND learner_id = $2 AND status = 'IN_PROGRESS'
      RETURNING id`,
    [id, LEARNER_ID]
  );

  if (rows.length === 0) {
    return NextResponse.json({ code: 'SESSION_NOT_FOUND', message: `No in-progress Quick Lab session ${id}` }, { status: 404 });
  }

  return NextResponse.json({ sessionId: id, status: 'COMPLETED' });
}
