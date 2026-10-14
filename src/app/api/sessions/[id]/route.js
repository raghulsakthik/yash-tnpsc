import { NextResponse } from 'next/server';
import { getSessionWithAttempts } from '../../../../services/sessionService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions/:id
 *
 * The session plus every attempt linked to it — the technical proof that
 * LESSON -> PRACTICE -> ATTEMPT -> MISTAKE ANALYSIS -> TOPIC STATE UPDATE
 * all tie back to one coherent run, not a loose pile of unrelated attempts.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const session = await getSessionWithAttempts(id);
  if (!session) {
    return NextResponse.json({ code: 'SESSION_NOT_FOUND', message: `no session ${id}` }, { status: 404 });
  }
  return NextResponse.json(session);
}
