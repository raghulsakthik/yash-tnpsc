import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../../../lib/auth.mjs';
import { getInterventionEffectivenessByTopic } from '../../../../../../services/interventionService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/interventions/effectiveness/by-topic
 *
 * Phase 30.2: real evaluated-intervention history, grouped per topic —
 * "for this concept, which real intervention type has worked best so far."
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const result = await getInterventionEffectivenessByTopic(learner.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'INTERVENTION_EFFECTIVENESS_BY_TOPIC_FAILED', message: err.message }, { status: 500 });
  }
}
