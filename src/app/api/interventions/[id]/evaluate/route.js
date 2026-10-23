import { NextResponse } from 'next/server';
import { evaluateIntervention } from '../../../../../services/interventionService.mjs';
import { ValidationError, NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/interventions/:id/evaluate
 *
 * Takes the post snapshot (current mastery/retention, Phase 6) and answers
 * the question this phase exists for: did this recommendation actually
 * work? Time spent is summed from real question_attempt rows since the
 * intervention started — no separate tracking mechanism.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const result = await evaluateIntervention(id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'INTERVENTION_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'INTERVENTION_ALREADY_EVALUATED', message: err.message }, { status: 409 });
    }
    return NextResponse.json({ code: 'INTERVENTION_EVALUATE_FAILED', message: err.message }, { status: 500 });
  }
}
