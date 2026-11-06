import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../lib/auth.mjs';
import { getExamReadiness } from '../../../../services/examReadinessService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/exam-readiness
 *
 * Phase 28.3: the TNPSC Exam Readiness Index — explicitly not a pass
 * probability. Every call also persists a real snapshot, so the next call
 * can honestly explain why the score moved, not guess.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const readiness = await getExamReadiness(learner.id);
    return NextResponse.json(readiness);
  } catch (err) {
    return NextResponse.json({ code: 'EXAM_READINESS_FAILED', message: err.message }, { status: 500 });
  }
}
