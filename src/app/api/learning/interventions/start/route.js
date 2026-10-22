import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../../lib/auth.mjs';
import { startInterventionForLearner } from '../../../../../services/recommendationService.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'Login required' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'BAD_JSON' }, { status: 400 }); }
  try {
    const intervention = await startInterventionForLearner(learnerId, body || {});
    return NextResponse.json({ intervention });
  } catch (err) {
    return NextResponse.json({ code: 'INTERVENTION_START_FAILED', message: err.message }, { status: 400 });
  }
}
