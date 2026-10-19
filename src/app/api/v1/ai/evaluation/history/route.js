import { NextResponse } from 'next/server';
import { getEvaluationHistory } from '../../../../../../services/aiEvaluationService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/ai/evaluation/history
 *
 * Phase 30.7: every real, persisted evaluation run for the 'ai-tutor'
 * capability, oldest first — the real history behind "v1 -> 72%, v2 -> 84%".
 */
export async function GET() {
  try {
    const history = await getEvaluationHistory();
    return NextResponse.json(history);
  } catch (err) {
    return NextResponse.json({ code: 'AI_EVALUATION_HISTORY_FAILED', message: err.message }, { status: 500 });
  }
}
