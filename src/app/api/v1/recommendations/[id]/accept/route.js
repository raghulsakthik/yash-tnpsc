import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../../lib/db.mjs';
import { acceptRecommendationForLearner } from '../../../../../../services/recommendationService.mjs';
import { NotFoundError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/recommendations/:id/accept
 *
 * Accepting a topic-targeted recommendation starts a real intervention
 * (src/services/recommendationService.mjs's own acceptRecommendationForLearner),
 * so whether it actually worked is measurable later.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const result = await acceptRecommendationForLearner(LEARNER_ID, id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'RECOMMENDATION_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'RECOMMENDATION_ACCEPT_FAILED', message: err.message }, { status: 500 });
  }
}
