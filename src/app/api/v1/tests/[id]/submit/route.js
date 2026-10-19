import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../../lib/db.mjs';
import { submitAdaptiveTest } from '../../../../../../services/adaptiveTestService.mjs';
import { NotFoundError, ValidationError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/tests/:id/submit
 *
 * Runs the rest of 27.3's lifecycle in one transaction: every answered
 * question graded through the real recordAttempt() pipeline (mode:
 * 'ASSESSMENT'), then the full 27.4 diagnostic (strengths/weaknesses/
 * cognitive problems/retention problems), stored on the test.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const result = await submitAdaptiveTest(id, LEARNER_ID);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'ADAPTIVE_TEST_SUBMIT_FAILED', message: err.message }, { status: 500 });
  }
}
