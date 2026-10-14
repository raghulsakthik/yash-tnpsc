import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
import { decideNextActionForTopic } from '../../../../../services/adaptiveDecisionService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/adaptive-decision/:topicId
 *
 * The Adaptive Decision Engine: scores all eight candidate actions
 * (REPEAT_LESSON, PREREQUISITE_LESSON, PRACTICE, TIMED_PRACTICE, REVISION,
 * MEMORY_ECHO, ADVANCE_TOPIC, MINI_ASSESSMENT) for this learner on this
 * topic from the same evidence Phase 4 (classification) and Phase 6 (the
 * digital twin's risk signals) already compute, and returns the winner plus
 * every runner-up's score — an auditable decision, not just an assertion.
 */
export async function GET(request, { params }) {
  const { topicId } = await params;
  try {
    const decision = await decideNextActionForTopic(LEARNER_ID, topicId);
    return NextResponse.json(decision);
  } catch (err) {
    return NextResponse.json({ code: 'ADAPTIVE_DECISION_FAILED', message: err.message }, { status: 500 });
  }
}
