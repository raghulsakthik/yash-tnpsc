import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../lib/auth.mjs';
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
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const action = await getExpandedNextAction(learner.id);
    return NextResponse.json(action);
  } catch (err) {
    return NextResponse.json({ code: 'EXPANDED_NEXT_ACTION_FAILED', message: err.message }, { status: 500 });
  }
}
