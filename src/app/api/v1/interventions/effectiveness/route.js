import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../../lib/auth.mjs';
import { getInterventionEffectiveness } from '../../../../../services/interventionService.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/interventions/effectiveness — real IMPROVED/NO_CHANGE/REGRESSED counts, overall and by action type. */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const summary = await getInterventionEffectiveness(learner.id);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ code: 'INTERVENTION_EFFECTIVENESS_FAILED', message: err.message }, { status: 500 });
  }
}
