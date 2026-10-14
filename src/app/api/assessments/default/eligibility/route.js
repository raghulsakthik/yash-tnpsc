import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
import { checkDefaultAssessmentEligibility } from '../../../../../services/defaultAssessmentService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/assessments/default/eligibility
 *
 * Whether the learner has enough foundation-topic exposure yet to take the
 * Default Foundation Test, without creating one.
 */
export async function GET() {
  try {
    const eligibility = await checkDefaultAssessmentEligibility(LEARNER_ID);
    return NextResponse.json(eligibility);
  } catch (err) {
    return NextResponse.json({ code: 'ELIGIBILITY_CHECK_FAILED', message: err.message }, { status: 500 });
  }
}
