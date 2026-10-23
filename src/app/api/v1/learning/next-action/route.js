import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
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
  try {
    const { selectedTopic } = await selectDailyTopicForLearner(LEARNER_ID);
    if (!selectedTopic?.id) {
      return NextResponse.json({ action: null, reason: 'no published learning topic is available yet' });
    }
    const action = await decideNextActionForTopic(LEARNER_ID, selectedTopic.id);
    return NextResponse.json(action);
  } catch (err) {
    return NextResponse.json({ code: 'NEXT_ACTION_FAILED', message: err.message }, { status: 500 });
  }
}
