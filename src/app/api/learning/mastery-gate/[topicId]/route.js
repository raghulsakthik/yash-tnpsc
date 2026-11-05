import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../../lib/auth.mjs';
import { getMasteryGate } from '../../../../../services/masteryGateService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/mastery-gate/:topicId
 *
 * Whether she can progress past this topic: a six-state readiness ladder
 * (FOUNDATION_REQUIRED/DEVELOPING/PRACTICING/NEAR_MASTERY/MASTERED/
 * RETAINED) built from the already-persisted mastery dimensions, plus the
 * one thing that actually makes it a *gate* — high practice mastery alone
 * never reads as MASTERED until a real assessment has confirmed it.
 */
export async function GET(request, { params }) {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  const { topicId } = await params;
  try {
    const result = await getMasteryGate(learner.id, topicId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'MASTERY_GATE_FAILED', message: err.message }, { status: 500 });
  }
}
