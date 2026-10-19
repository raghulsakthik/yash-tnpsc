import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../../lib/db.mjs';
import { acceptRecommendation } from '../../../../../../services/recommendationService.mjs';
import { NotFoundError, ValidationError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/recommendations/:id/accept
 *
 * Phase 27.6: accepting a topic-targeted recommendation starts a real
 * Phase 14 intervention (unchanged), so whether it actually worked is
 * measurable later via GET /api/v1/interventions/effectiveness.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const result = await acceptRecommendation(id, LEARNER_ID);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'RECOMMENDATION_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'RECOMMENDATION_ACCEPT_FAILED', message: err.message }, { status: 500 });
  }
}
