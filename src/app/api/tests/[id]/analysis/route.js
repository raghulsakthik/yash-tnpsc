import { NextResponse } from 'next/server';
import { analyzeAptitudeAssessment } from '../../../../../services/aptitudeAssessmentService.mjs';
import { NotFoundError, ValidationError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tests/:id/analysis
 *
 * The Aptitude Assessment Layer's diagnostic + adaptive intervention step,
 * applied to an already-completed weekly test — reusing Phase 3/4/10's
 * diagnostic engine and Phase 11's adaptive decision engine exactly as they
 * already work for the Default Foundation Test, over the same underlying
 * weekly-test infrastructure (unchanged) rather than a second system.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const analysis = await analyzeAptitudeAssessment(id);
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'TEST_NOT_COMPLETED', message: err.message }, { status: 409 });
    }
    return NextResponse.json({ code: 'TEST_ANALYSIS_FAILED', message: err.message }, { status: 500 });
  }
}
