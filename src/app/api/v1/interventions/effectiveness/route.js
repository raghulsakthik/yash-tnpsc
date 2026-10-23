import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
import { getInterventionEffectiveness } from '../../../../../services/interventionService.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/interventions/effectiveness — real IMPROVED/NO_CHANGE/REGRESSED counts, overall and by action type. */
export async function GET() {
  try {
    const summary = await getInterventionEffectiveness(LEARNER_ID);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ code: 'INTERVENTION_EFFECTIVENESS_FAILED', message: err.message }, { status: 500 });
  }
}
