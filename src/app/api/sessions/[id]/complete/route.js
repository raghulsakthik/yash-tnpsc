import { NextResponse } from 'next/server';
import { completeSession } from '../../../../../services/sessionService.mjs';
import { NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/:id/complete
 *
 * Marks a learning_session finished. Practice/revision/test flows already
 * have their own completion signal (sessionLength reached, test submitted);
 * this exists for a lesson/practice session not backed by one of those.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const session = await completeSession(id);
    return NextResponse.json(session);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'SESSION_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'SESSION_COMPLETE_FAILED', message: err.message }, { status: 500 });
  }
}
