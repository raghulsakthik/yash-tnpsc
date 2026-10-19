import { NextResponse } from 'next/server';
import { explainTestConstruction } from '../../../../../../services/aiInsightsService.mjs';
import { NotFoundError, ValidationError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/tests/:id/ai-explanation
 *
 * Phase 30.5: the AI-narrated version of Phase 28's own, real, already
 * deterministic test-construction explanation (GET .../explanation) —
 * same real blueprint, put into plainer language.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const explanation = await explainTestConstruction(id);
    return NextResponse.json(explanation);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'AI_TEST_EXPLANATION_FAILED', message: err.message }, { status: 500 });
  }
}
