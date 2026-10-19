import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
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
  try {
    const result = await getAiFeedbackLoop(LEARNER_ID);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'AI_FEEDBACK_LOOP_FAILED', message: err.message }, { status: 500 });
  }
}
