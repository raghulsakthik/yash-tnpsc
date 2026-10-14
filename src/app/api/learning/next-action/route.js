import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { getInitialLearningAction } from '../../../../services/learningPlanService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/next-action
 *
 * The Foundation Learning Engine's one valid initial action: of the
 * foundation-adjacent topics, which are actually safe to start right now
 * (PrerequisiteGate), which one is neediest among those (LessonSelector),
 * and at what difficulty (DifficultySelector). Works for a learner with no
 * state at all — this is the entry point before /api/plan/today has
 * anything real to work with.
 */
export async function GET() {
  try {
    const action = await getInitialLearningAction(LEARNER_ID);
    return NextResponse.json(action);
  } catch (err) {
    return NextResponse.json({ code: 'NEXT_ACTION_FAILED', message: err.message }, { status: 500 });
  }
}
