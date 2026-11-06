import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../../lib/auth.mjs';
import { explainReadiness } from '../../../../../services/aiInsightsService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/ai/readiness-explanation
 *
 * Phase 30.6: the real, deterministic readiness score (Phase 28,
 * unchanged) with an AI-narrated explanation of what's driving it. AI
 * never invents or restates a different score — the overall/breakdown
 * returned here are the exact real values GET /api/v1/exam-readiness
 * computed.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const result = await explainReadiness(learner.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'AI_READINESS_EXPLANATION_FAILED', message: err.message }, { status: 500 });
  }
}
