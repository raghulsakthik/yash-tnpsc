import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../../lib/auth.mjs';
import { decideNextActionForTopic } from '../../../../../services/adaptiveDecisionService.mjs';
import { selectDailyTopicForLearner } from '../../../../../services/dailyPlanService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/learning/next-action — the single best next action, picking
 * a topic the same way the real dashboard plan does (selectDailyTopicForLearner,
 * src/services/dailyPlanService.mjs) and scoring it with the real adaptive
 * decision engine.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const { selectedTopic } = await selectDailyTopicForLearner(learner.id);
    if (!selectedTopic?.id) {
      return NextResponse.json({ action: null, reason: 'no published learning topic is available yet' });
    }
    const action = await decideNextActionForTopic(learner.id, selectedTopic.id);
    return NextResponse.json(action);
  } catch (err) {
    return NextResponse.json({ code: 'NEXT_ACTION_FAILED', message: err.message }, { status: 500 });
  }
}
