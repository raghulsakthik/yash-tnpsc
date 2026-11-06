import { NextResponse } from 'next/server';
import { recordEvent } from '../../../../../lib/db.mjs';
import { requireLearner } from '../../../../../lib/auth.mjs';
import { submitDefaultAssessment } from '../../../../../services/defaultAssessmentService.mjs';
import { ValidationError, NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/assessments/:id/submit
 *
 * Finalizes the Default Foundation Test: every answered question runs
 * through the same recordAttempt pipeline practice/revision/the weekly test
 * use (mode 'ASSESSMENT'), so this is evidence into the same learner model,
 * not a separate scoring system. Then computes and stores the initial
 * learner diagnosis (per-topic accuracy/speed/confidence/mistakes, a
 * difficulty breakdown, and prerequisite gaps) on the assessment row.
 */
export async function POST(request, { params }) {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  const { id } = await params;
  try {
    const result = await submitDefaultAssessment(id, learner.id);
    await recordEvent(learner.id, 'DEFAULT_ASSESSMENT_COMPLETED', null, {
      assessmentId: id,
      score: result.score,
      questionCount: result.questionCount,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'ASSESSMENT_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'ASSESSMENT_COMPLETED', message: err.message }, { status: 409 });
    }
    return NextResponse.json({ code: 'ASSESSMENT_SUBMIT_FAILED', message: err.message }, { status: 500 });
  }
}
