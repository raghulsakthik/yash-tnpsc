import { NextResponse } from 'next/server';
import { solveQuestion } from '../../../../../services/pyqAssistantService.mjs';
import { NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/ai/solve
 * body: { questionId }
 *
 * The full step-by-step solution plus a real similar question on the same
 * topic (never a generated one) — deterministic, read-only, same caveat as
 * /api/v1/ai/hint.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }
  const { questionId } = body;
  if (!questionId) return NextResponse.json({ code: 'MISSING_FIELDS', message: 'questionId is required' }, { status: 400 });

  try {
    const result = await solveQuestion(questionId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'PYQ_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'AI_SOLVE_FAILED', message: err.message }, { status: 500 });
  }
}
