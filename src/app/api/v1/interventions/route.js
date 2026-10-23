import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { listInterventions } from '../../../../services/interventionService.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/interventions — every real intervention (Phase 14, unchanged), active and evaluated. */
export async function GET() {
  try {
    const interventions = await listInterventions(LEARNER_ID);
    return NextResponse.json({ interventions });
  } catch (err) {
    return NextResponse.json({ code: 'INTERVENTIONS_FAILED', message: err.message }, { status: 500 });
  }
}
