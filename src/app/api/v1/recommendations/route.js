import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { getRecommendationsForLearner } from '../../../../services/recommendationService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/recommendations
 *
 * Reuses the real, now-authoritative recommendation engine
 * (src/services/recommendationService.mjs) — lists whatever has already
 * been surfaced for this learner. To surface a new one for a specific
 * topic, POST /api/learning/recommendations (main's own route).
 */
export async function GET() {
  try {
    const recommendations = await getRecommendationsForLearner(LEARNER_ID);
    return NextResponse.json({ recommendations });
  } catch (err) {
    return NextResponse.json({ code: 'RECOMMENDATIONS_FAILED', message: err.message }, { status: 500 });
  }
}
