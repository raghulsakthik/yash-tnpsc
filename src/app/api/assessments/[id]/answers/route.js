import { NextResponse } from 'next/server';
import { saveDefaultAssessmentAnswer } from '../../../../../services/defaultAssessmentService.mjs';
import { ValidationError, NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/assessments/:id/answers
 * body: { questionId, selectedIndex, timeTakenMs, confidence }
 *
 * Upserts one answer, confidence included (the Default Foundation Test
 * measures confidence calibration as part of the initial learner model).
 * No correctness is returned — nothing is revealed until submission.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  try {
    await saveDefaultAssessmentAnswer(id, body);
    return NextResponse.json({ saved: true });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'ASSESSMENT_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      const status = err.message.includes('already been submitted') ? 409 : 400;
      return NextResponse.json({ code: status === 409 ? 'ASSESSMENT_COMPLETED' : 'MISSING_FIELDS', message: err.message }, { status });
    }
    return NextResponse.json({ code: 'ANSWER_SAVE_FAILED', message: err.message }, { status: 500 });
  }
}
