import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../../lib/auth.mjs';
import { getWeeklyAssignment } from '../../../../../services/weeklyAssignmentService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/learning/plan
 *
 * The real weekly plan (Phase 16/25, unchanged) — composed here, not
 * rebuilt, since it already is "what should happen, day by day."
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const plan = await getWeeklyAssignment(learner.id);
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ code: 'LEARNING_PLAN_FAILED', message: err.message }, { status: 500 });
  }
}
