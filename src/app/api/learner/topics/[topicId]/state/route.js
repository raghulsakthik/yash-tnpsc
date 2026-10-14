import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../../lib/db.mjs';
import { getTopicState } from '../../../../../../services/learnerStateService.mjs';
import { NotFoundError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learner/topics/:topicId/state
 *
 * The full digital-twin view for one topic: the six persisted dimensions as
 * they stand right now, plus learningVelocity/misconceptionRisk/
 * fatigueRisk/prerequisiteRisk computed fresh — and the evidence behind
 * every one of them, never a bare score.
 */
export async function GET(request, { params }) {
  const { topicId } = await params;
  try {
    const state = await getTopicState(LEARNER_ID, topicId);
    return NextResponse.json(state);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TOPIC_STATE_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'TOPIC_STATE_FAILED', message: err.message }, { status: 500 });
  }
}
