import { NextResponse } from 'next/server';
import { explainTest } from '../../../../../../services/testExplanationService.mjs';
import { NotFoundError, ValidationError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/tests/:id/explanation
 *
 * Phase 28.4's Test Construction Intelligence: "why this test" (the real
 * stored blueprint) and "why this question" (the real stored selection
 * breakdown, Phase 27) — formatted, never recomputed.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const explanation = await explainTest(id);
    return NextResponse.json(explanation);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'TEST_EXPLANATION_FAILED', message: err.message }, { status: 500 });
  }
}
