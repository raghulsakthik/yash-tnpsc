import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
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
  try {
    const summary = await getLearnerSummary(LEARNER_ID);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ code: 'LEARNER_SUMMARY_FAILED', message: err.message }, { status: 500 });
  }
}
