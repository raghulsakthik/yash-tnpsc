import { NextResponse } from 'next/server';
import { saveAdaptiveTestAnswer } from '../../../../../../services/adaptiveTestService.mjs';
import { NotFoundError, ValidationError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/tests/:id/answer
 * body: { questionId, selectedIndex, timeTakenMs, confidence }
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
    await saveAdaptiveTestAnswer(id, body);
    return NextResponse.json({ saved: true });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'ADAPTIVE_TEST_ANSWER_FAILED', message: err.message }, { status: 500 });
  }
}
