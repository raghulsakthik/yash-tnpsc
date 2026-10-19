import { NextResponse } from 'next/server';
import { explainQuestion } from '../../../../../services/pyqAssistantService.mjs';
import { NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/ai/explain
 * body: { questionId, selectedIndex? }
 *
 * Why the correct option is right, why every other option is wrong (using
 * the real authored `trap` when it's the option she actually picked), and
 * — if selectedIndex was given — why her specific choice was wrong.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }
  const { questionId, selectedIndex = null } = body;
  if (!questionId) return NextResponse.json({ code: 'MISSING_FIELDS', message: 'questionId is required' }, { status: 400 });

  try {
    const result = await explainQuestion(questionId, selectedIndex);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'PYQ_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'AI_EXPLAIN_FAILED', message: err.message }, { status: 500 });
  }
}
