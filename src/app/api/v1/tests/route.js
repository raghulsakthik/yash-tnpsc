import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { createAdaptiveTest } from '../../../../services/adaptiveTestService.mjs';
import { ValidationError } from '../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/tests
 * body: { questionCount? }
 *
 * Phase 27.1-27.3: TEST CREATED + BLUEPRINT GENERATED + QUESTIONS SELECTED,
 * collapsed into one call (the same precedent Phase 3's Default Foundation
 * Test already set) — a real blueprint (27.1) over real evidence, real
 * questions scored and picked (27.2), stored DRAFT until POST .../start.
 */
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine — questionCount defaults
  }

  try {
    const test = await createAdaptiveTest(LEARNER_ID, { questionCount: body.questionCount });
    return NextResponse.json(test, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'ADAPTIVE_TEST_CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
