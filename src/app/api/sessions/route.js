import { NextResponse } from 'next/server';
import { requireLearner } from '../../../lib/auth.mjs';
import { startLearningSession } from '../../../services/sessionService.mjs';
import { ValidationError } from '../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions
 * body: { topicId, sessionType, metadata? }
 *
 * Starts a learning_session — the container a lesson/practice/revision/test
 * run's attempts can be linked to (see POST /api/attempts' sessionId field).
 * This table and its service have existed since Phase 2; this is the first
 * route that actually calls them.
 */
export async function POST(request) {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const { topicId = null, sessionType, metadata = {} } = body;

  try {
    const session = await startLearningSession({ learnerId: learner.id, topicId, sessionType, metadata });
    return NextResponse.json(session);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_FAILED', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'SESSION_CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
