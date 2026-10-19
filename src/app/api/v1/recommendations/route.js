import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { getRecommendations } from '../../../../services/recommendationService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/recommendations
 *
 * Phase 27.5: scores every real candidate action (reusing Phase 11's own
 * topic-level scoring, plus PYQ/game/weekly-test candidates this phase
 * adds) against the brief's eight-factor score, persists the ranked list
 * as real, trackable rows (27.6), and returns them — most-confident first.
 */
export async function GET() {
  try {
    const result = await getRecommendations(LEARNER_ID);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'RECOMMENDATIONS_FAILED', message: err.message }, { status: 500 });
  }
}
