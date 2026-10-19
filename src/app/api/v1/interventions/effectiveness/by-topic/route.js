import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../../lib/db.mjs';
import { getInterventionEffectivenessByTopic } from '../../../../../../services/interventionService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/interventions/effectiveness/by-topic
 *
 * Phase 30.2: real evaluated-intervention history, grouped per topic —
 * "for this concept, which real intervention type has worked best so far."
 */
export async function GET() {
  try {
    const result = await getInterventionEffectivenessByTopic(LEARNER_ID);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'INTERVENTION_EFFECTIVENESS_BY_TOPIC_FAILED', message: err.message }, { status: 500 });
  }
}
