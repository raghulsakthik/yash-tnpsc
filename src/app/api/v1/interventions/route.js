import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../lib/auth.mjs';
import { listInterventions } from '../../../../services/interventionService.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/interventions — every real intervention (Phase 14, unchanged), active and evaluated. */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const interventions = await listInterventions(learner.id);
    return NextResponse.json({ interventions });
  } catch (err) {
    return NextResponse.json({ code: 'INTERVENTIONS_FAILED', message: err.message }, { status: 500 });
  }
}
