import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../../lib/auth.mjs';
import { getAiFeedbackLoop } from '../../../../../services/aiFeedbackLoopService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/ai/feedback-loop
 *
 * Phase 29.7: real AI-assisted vs unassisted learning-gain comparison,
 * reusing Phase 14's intervention-effectiveness tracking unchanged — an
 * honest "not enough evidence yet" when either side has no real,
 * evaluated interventions.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const result = await getAiFeedbackLoop(learner.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'AI_FEEDBACK_LOOP_FAILED', message: err.message }, { status: 500 });
  }
}
