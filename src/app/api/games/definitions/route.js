import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/games/definitions
 *
 * Every active GameDefinition — new games are new configuration rows, not
 * new code, so this is simply what's currently configured.
 */
export async function GET() {
  try {
    const { rows } = await query(
      `SELECT id, name, target_topic_ids, difficulty_floor::float8 AS difficulty_floor,
              difficulty_ceiling::float8 AS difficulty_ceiling, question_count,
              time_limit_seconds, mechanics
         FROM game_definition WHERE status = 'ACTIVE' ORDER BY id`
    );
    return NextResponse.json({
      definitions: rows.map((r) => ({
        id: r.id,
        name: r.name,
        targetTopicIds: r.target_topic_ids,
        difficultyFloor: r.difficulty_floor,
        difficultyCeiling: r.difficulty_ceiling,
        questionCount: r.question_count,
        timeLimitSeconds: r.time_limit_seconds,
        mechanics: r.mechanics,
      })),
    });
  } catch (err) {
    return NextResponse.json({ code: 'GAME_DEFINITIONS_FAILED', message: err.message }, { status: 500 });
  }
}
