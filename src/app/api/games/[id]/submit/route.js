import { NextResponse } from 'next/server';
import { LEARNER_ID, recordEvent } from '../../../../../lib/db.mjs';
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
  const { id } = await params;
  try {
    const result = await submitGame(id, LEARNER_ID);
    await recordEvent(LEARNER_ID, 'GAME_COMPLETED', null, result);
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
