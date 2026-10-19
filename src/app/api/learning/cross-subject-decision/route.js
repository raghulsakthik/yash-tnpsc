import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { getCrossSubjectDecision } from '../../../../services/crossSubjectDecisionService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/cross-subject-decision
 *
 * The full decision hierarchy: Learner State -> Subject Priority -> Topic
 * Priority -> Action Priority. Decides which subject deserves attention
 * today (weakness, real exam weight, neglect, momentum — the same
 * weighted-sum pattern selectTopic already uses, lifted one level up),
 * then hands off to the existing, unchanged topic-selection and Adaptive
 * Decision Engine scoped to that subject.
 */
export async function GET() {
  try {
    const decision = await getCrossSubjectDecision(LEARNER_ID);
    return NextResponse.json(decision);
  } catch (err) {
    return NextResponse.json({ code: 'CROSS_SUBJECT_DECISION_FAILED', message: err.message }, { status: 500 });
  }
}
