import { NextResponse } from 'next/server';
import { LEARNER_ID, recordEvent } from '../../../../lib/db.mjs';
import { startDefaultAssessment } from '../../../../services/defaultAssessmentService.mjs';
import { ValidationError } from '../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/assessments/default
 *
 * Starts the Default Foundation Test, or resumes the learner's existing
 * in-progress one. 409s with NOT_ELIGIBLE if she hasn't been exposed to
 * enough foundation topics yet (see eligibility/route.js to check first
 * without side effects).
 */
export async function POST() {
  try {
    const assessment = await startDefaultAssessment(LEARNER_ID);
    await recordEvent(LEARNER_ID, 'DEFAULT_ASSESSMENT_STARTED', null, { assessmentId: assessment.assessmentId });
    return NextResponse.json(assessment);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'NOT_ELIGIBLE', message: err.message }, { status: 409 });
    }
    return NextResponse.json({ code: 'DEFAULT_ASSESSMENT_CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
