import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../lib/auth.mjs';
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
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const recommendations = await getRecommendationsForLearner(learner.id);
    return NextResponse.json({ recommendations });
  } catch (err) {
    return NextResponse.json({ code: 'RECOMMENDATIONS_FAILED', message: err.message }, { status: 500 });
  }
}
