import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { evaluateAndRecordMilestones } from '../../../../services/milestoneService.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/milestones/evaluate
 *
 * Re-derives every milestone from real evidence (the event stream, real
 * question_attempt history, Phase 13's mastery gate, Phase 15's test
 * comparison) and persists anything newly unlocked — idempotent, never
 * re-awards or un-awards an already-earned achievement. Nothing calls this
 * automatically yet; see docs/phase-17-completion.md.
 */
export async function POST() {
  try {
    const result = await evaluateAndRecordMilestones(LEARNER_ID);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'MILESTONE_EVALUATION_FAILED', message: err.message }, { status: 500 });
  }
}
