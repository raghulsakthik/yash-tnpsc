import { NextResponse } from 'next/server';
import { recordEvent } from '../../../../../lib/db.mjs';
import { requireLearner } from '../../../../../lib/auth.mjs';
import { submitGame } from '../../../../../services/gameService.mjs';
import { ValidationError, NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/games/:id/submit
 *
 * Finalizes the game: every answered question runs through the same
 * recordAttempt() pipeline (mode: 'GAME') practice/revision/tests/
 * assessments already share, so game results update mastery, difficulty
 * and the revision schedule exactly like any other activity — then scores
 * the session (points, streak bonuses) on top of that same grading.
 */
export async function POST(request, { params }) {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  const { id } = await params;
  try {
    const result = await submitGame(id, learner.id);
    await recordEvent(learner.id, 'GAME_COMPLETED', null, result);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'GAME_SESSION_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'GAME_COMPLETED', message: err.message }, { status: 409 });
    }
    return NextResponse.json({ code: 'GAME_SUBMIT_FAILED', message: err.message }, { status: 500 });
  }
}
