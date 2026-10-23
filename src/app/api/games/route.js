import { NextResponse } from 'next/server';
import { LEARNER_ID, recordEvent } from '../../../lib/db.mjs';
import { startGame } from '../../../services/gameService.mjs';
import { ValidationError, NotFoundError } from '../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/games
 * body: { gameDefinitionId }
 *
 * Starts (or resumes) a game session from a GameDefinition — the same
 * question-selection logic (pickTopicQuestions, unchanged) every other
 * part of the engine uses, scoped to the definition's configured topics
 * and difficulty band.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const { gameDefinitionId } = body;
  if (!gameDefinitionId) {
    return NextResponse.json({ code: 'MISSING_FIELDS', message: 'gameDefinitionId is required' }, { status: 400 });
  }

  try {
    const session = await startGame(LEARNER_ID, gameDefinitionId);
    await recordEvent(LEARNER_ID, 'GAME_STARTED', null, { sessionId: session.sessionId, gameDefinitionId });
    return NextResponse.json(session);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'GAME_DEFINITION_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'GAME_START_FAILED', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'GAME_START_FAILED', message: err.message }, { status: 500 });
  }
}
