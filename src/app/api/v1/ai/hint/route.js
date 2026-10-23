import { NextResponse } from 'next/server';
import { getHint } from '../../../../../services/pyqAssistantService.mjs';
import { NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/ai/hint
 * body: { questionId, stage }
 *
 * Phase 26.4's progressive assistance, deterministic (no AI provider is
 * configured in this environment — see completion report): stage 1 is a
 * hint, 2 adds strategy, 3 the guided solution, 4 the full explanation.
 * Read-only — never touches learner mastery or the authoritative answer.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }
  const { questionId, stage = 1 } = body;
  if (!questionId) return NextResponse.json({ code: 'MISSING_FIELDS', message: 'questionId is required' }, { status: 400 });

  try {
    const result = await getHint(questionId, stage);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'PYQ_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'AI_HINT_FAILED', message: err.message }, { status: 500 });
  }
}
