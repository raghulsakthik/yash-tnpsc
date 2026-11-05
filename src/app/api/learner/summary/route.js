import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../lib/auth.mjs';
import { getLearnerSummary } from '../../../../services/learnerStateService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learner/summary
 *
 * The learner-level digital twin: every topic she has touched at all,
 * classified live from today's learner_topic_state (not a past assessment
 * snapshot), plus learner-wide aggregates.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const summary = await getLearnerSummary(learner.id);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ code: 'LEARNER_SUMMARY_FAILED', message: err.message }, { status: 500 });
  }
}
