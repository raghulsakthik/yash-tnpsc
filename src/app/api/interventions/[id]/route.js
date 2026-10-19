import { NextResponse } from 'next/server';
import { getIntervention } from '../../../../services/interventionService.mjs';
import { NotFoundError } from '../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/interventions/:id */
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const intervention = await getIntervention(id);
    return NextResponse.json(intervention);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'INTERVENTION_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'INTERVENTION_FETCH_FAILED', message: err.message }, { status: 500 });
  }
}
