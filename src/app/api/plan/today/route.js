import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { buildDailyPlan } from '../../../../domain/planner.mjs';
import { decideNextActionForTopic } from '../../../../services/adaptiveDecisionService.mjs';
import { selectDailyTopicForLearner } from '../../../../services/dailyPlanService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/plan/today
 *
 * The "Next Best Action": one recommendation for what she should do right
 * now, built from revision urgency, exam-weighted topic priority and the
 * prerequisite graph. The frontend renders this; it decides nothing.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const { candidates, selectedTopic, revisionDueCount } = await selectDailyTopicForLearner(learnerId);

    // Topic selection answers "where should attention go?". The adaptive
    // decision engine answers the harder question "what should happen there
    // right now?" Both the dashboard and next-action API consume this same
    // selection service so they cannot drift apart.
    const adaptiveDecision = selectedTopic
      ? await decideNextActionForTopic(learnerId, selectedTopic.id)
      : null;

    return NextResponse.json(buildDailyPlan({
      topics: candidates,
      revisionDueCount,
      selectedTopic,
      adaptiveDecision,
    }));
  } catch (err) {
    return NextResponse.json({ code: 'PLAN_FAILED', message: err.message }, { status: 500 });
  }
}
