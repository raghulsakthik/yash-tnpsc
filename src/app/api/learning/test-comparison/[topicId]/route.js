import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../../lib/auth.mjs';
import { evaluateInterventionAcrossTests } from '../../../../../services/interventionEffectivenessService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/test-comparison/:topicId
 *
 * InterventionEffectivenessService: the test-to-test comparison for one
 * topic specifically, plus whatever real tracked intervention (Phase 14)
 * was running on it — the fuller picture of whether what was tried is
 * actually what moved the numbers.
 */
export async function GET(request, { params }) {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  const { topicId } = await params;
  try {
    const result = await evaluateInterventionAcrossTests(learner.id, topicId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'INTERVENTION_EFFECTIVENESS_FAILED', message: err.message }, { status: 500 });
  }
}
