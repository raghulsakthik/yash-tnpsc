import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { getExpandedNextAction } from '../../../../services/intermediateProgressionService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/expanded-next-action
 *
 * Phase 7's gated topic selection, but over the Intermediate Progression
 * Engine's candidate pool: foundation topics only until every one of them
 * is mastered-and-confirmed, then foundation + intermediate together.
 */
export async function GET() {
  try {
    const action = await getExpandedNextAction(LEARNER_ID);
    return NextResponse.json(action);
  } catch (err) {
    return NextResponse.json({ code: 'EXPANDED_NEXT_ACTION_FAILED', message: err.message }, { status: 500 });
  }
}
