import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { getAdaptiveLessonPlan } from '../../../../services/adaptiveLessonPlanService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/adaptive-plan
 *
 * Adaptive Lesson Modification: the full projected route through the
 * foundation-candidate syllabus, with remediation spliced in wherever the
 * Adaptive Decision Engine (Phase 11) calls for it — never stopping at the
 * first topic that needs work, unlike GET /api/learning/next-action (Phase
 * 7) or the learning path attached to a completed assessment (Phase 5),
 * both of which answer "what do I do right now," not "what does the whole
 * route look like." Two learners on the identical syllabus can get entirely
 * different plans here, from the same backend logic.
 */
export async function GET() {
  try {
    const plan = await getAdaptiveLessonPlan(LEARNER_ID);
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ code: 'ADAPTIVE_PLAN_FAILED', message: err.message }, { status: 500 });
  }
}
