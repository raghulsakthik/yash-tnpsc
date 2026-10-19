import { NextResponse } from 'next/server';
import { saveGameAnswer } from '../../../../../services/gameService.mjs';
import { ValidationError, NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/games/:id/answers
 * body: { questionId, selectedIndex, timeTakenMs }
 *
 * Upserts one answer. No correctness or points are revealed until the
 * whole game is submitted.
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
    const result = await saveGameAnswer(id, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'GAME_SESSION_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      const status = err.message.includes('already finished') ? 409 : 400;
      return NextResponse.json({ code: status === 409 ? 'GAME_COMPLETED' : 'MISSING_FIELDS', message: err.message }, { status });
    }
    return NextResponse.json({ code: 'GAME_ANSWER_FAILED', message: err.message }, { status: 500 });
  }
}
