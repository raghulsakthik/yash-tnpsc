import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
import { getNextAction } from '../../../../../services/recommendationService.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/learning/next-action — the single top-ranked Next Best Action. */
export async function GET() {
  try {
    const action = await getNextAction(LEARNER_ID);
    return NextResponse.json(action ?? { action: null, reason: 'nothing to recommend yet' });
  } catch (err) {
    return NextResponse.json({ code: 'NEXT_ACTION_FAILED', message: err.message }, { status: 500 });
  }
}
