import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
import { runAiEvaluation } from '../../../../../services/aiEvaluationService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/ai/evaluation
 *
 * Phase 29.6: runs a real evaluation dataset (real, published questions,
 * their own real explanation as "expected") through the real AI Tutor
 * pipeline and scores every response deterministically — no second AI
 * call judges the first one.
 */
export async function GET() {
  try {
    const result = await runAiEvaluation(LEARNER_ID);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'AI_EVALUATION_FAILED', message: err.message }, { status: 500 });
  }
}
