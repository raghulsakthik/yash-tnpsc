import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../lib/auth.mjs';
import { getWeeklyAssignment } from '../../../../services/weeklyAssignmentService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/weekly-assignment
 *
 * Phase 25's Weekly Assignment Engine: the same week Phase 16's
 * /api/learning/weekly-plan already builds, with Friday's game slot
 * resolved against Phase 22's real, active game catalogue instead of
 * always reading as unavailable.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const plan = await getWeeklyAssignment(learner.id);
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ code: 'WEEKLY_ASSIGNMENT_FAILED', message: err.message }, { status: 500 });
  }
}
