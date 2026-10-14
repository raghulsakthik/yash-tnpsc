import { NextResponse } from 'next/server';
import { getDefaultAssessment } from '../../../../services/defaultAssessmentService.mjs';
import { NotFoundError } from '../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/assessments/:id
 *
 * Full assessment state for resuming: every question (no answer keys or
 * diagnostic while IN_PROGRESS), her answers/confidence so far, and the
 * assessment's status/score — mirrors GET /api/tests/:id.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const assessment = await getDefaultAssessment(id);
    return NextResponse.json(assessment);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'ASSESSMENT_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'ASSESSMENT_FETCH_FAILED', message: err.message }, { status: 500 });
  }
}
