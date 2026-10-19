import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../../lib/db.mjs';
import { getLearnerAiContext } from '../../../../../../services/learnerAiContextService.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/ai/context/:topicId — Phase 29.3's personalized learner context, the brief's own literal JSON shape. */
export async function GET(request, { params }) {
  const { topicId } = await params;
  try {
    const context = await getLearnerAiContext(LEARNER_ID, topicId);
    return NextResponse.json(context);
  } catch (err) {
    return NextResponse.json({ code: 'AI_CONTEXT_FAILED', message: err.message }, { status: 500 });
  }
}
