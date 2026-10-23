import { NextResponse } from 'next/server';
import { getAdaptiveTestAnalysis } from '../../../../../../services/adaptiveTestService.mjs';
import { NotFoundError, ValidationError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/tests/:id/analysis — the full Phase 27.4 diagnostic report for a completed test. */
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const analysis = await getAdaptiveTestAnalysis(id);
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'ADAPTIVE_TEST_ANALYSIS_FAILED', message: err.message }, { status: 500 });
  }
}
