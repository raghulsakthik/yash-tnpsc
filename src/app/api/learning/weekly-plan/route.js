import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../lib/auth.mjs';
import { getWeeklyPlan } from '../../../../services/weeklyPlanService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/weekly-plan
 *
 * The Weekly Plan Engine: Monday-Sunday, each day's target generated from
 * real evidence (Phase 3's eligibility, Phase 4/6's live classification,
 * Phase 7's gated initial action, the real revision queue, real PYQ-tagged
 * content) — recomputed fresh on every call, not a stored schedule, so it
 * reflects whatever has changed since she last looked at it.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const plan = await getWeeklyPlan(learner.id);
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ code: 'WEEKLY_PLAN_FAILED', message: err.message }, { status: 500 });
  }
}
