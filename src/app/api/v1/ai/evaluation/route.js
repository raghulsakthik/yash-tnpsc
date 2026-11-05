import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../../lib/auth.mjs';
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
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const result = await runAiEvaluation(learner.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'AI_EVALUATION_FAILED', message: err.message }, { status: 500 });
  }
}
