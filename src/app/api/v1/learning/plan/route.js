import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
import { getWeeklyAssignment } from '../../../../../services/weeklyAssignmentService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/learning/plan
 *
 * The real weekly plan (Phase 16/25, unchanged) — composed here, not
 * rebuilt, since it already is "what should happen, day by day."
 */
export async function GET() {
  try {
    const plan = await getWeeklyAssignment(LEARNER_ID);
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ code: 'LEARNING_PLAN_FAILED', message: err.message }, { status: 500 });
  }
}
