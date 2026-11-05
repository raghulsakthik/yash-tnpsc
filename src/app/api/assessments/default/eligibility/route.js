import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../../lib/auth.mjs';
import { checkDefaultAssessmentEligibility } from '../../../../../services/defaultAssessmentService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/assessments/default/eligibility
 *
 * Whether the learner has enough foundation-topic exposure yet to take the
 * Default Foundation Test, without creating one.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const eligibility = await checkDefaultAssessmentEligibility(learner.id);
    return NextResponse.json(eligibility);
  } catch (err) {
    return NextResponse.json({ code: 'ELIGIBILITY_CHECK_FAILED', message: err.message }, { status: 500 });
  }
}
