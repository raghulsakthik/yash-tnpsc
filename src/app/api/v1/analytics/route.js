import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../lib/auth.mjs';
import { getFullAnalytics } from '../../../../services/analyticsService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/analytics
 *
 * Phase 28.1/28.2: every named graph/report in one bundled call (the same
 * precedent Phase 26's GET /api/v1/pyq/trends already set) — mastery
 * progression (Graph 1), subject performance (Graph 2), speed-vs-accuracy
 * quadrant (Graph 3), real retention curves projected through Phase 24's
 * unchanged decay function (Graph 4), mistake evolution (Graph 5), plus
 * learning/PYQ/test analytics and Phase 18's progression tier.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const analytics = await getFullAnalytics(learner.id);
    return NextResponse.json(analytics);
  } catch (err) {
    return NextResponse.json({ code: 'ANALYTICS_FAILED', message: err.message }, { status: 500 });
  }
}
