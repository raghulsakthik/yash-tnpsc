import { NextResponse } from 'next/server';
import { getGameSession } from '../../../../services/gameService.mjs';
import { NotFoundError } from '../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/games/:id — full session state; answer keys withheld until completion. */
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const session = await getGameSession(id);
    return NextResponse.json(session);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'GAME_SESSION_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'GAME_SESSION_FETCH_FAILED', message: err.message }, { status: 500 });
  }
}
