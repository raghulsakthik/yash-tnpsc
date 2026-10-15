import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

function toJson(row) {
  return {
    exam: row.exam,
    language: row.language,
    dailyGoalMinutes: row.daily_goal_minutes,
    preferredTime: row.preferred_time,
    restDay: row.rest_day,
    difficultyBias: row.difficulty_bias,
  };
}

/** GET /api/profile — reads learner_profile (all columns, old and new). */
export async function GET() {
  const { rows } = await query(`SELECT * FROM learner_profile WHERE learner_id = $1`, [LEARNER_ID]);
  if (rows.length === 0) {
    return NextResponse.json({ code: 'PROFILE_NOT_FOUND', message: 'No profile row for this learner' }, { status: 404 });
  }
  return NextResponse.json(toJson(rows[0]));
}

/**
 * PUT /api/profile
 * body: any subset of {language, dailyGoalMinutes, preferredTime, restDay, difficultyBias}
 */
export async function PUT(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  if (body.difficultyBias && !['gentle', 'normal', 'hard'].includes(body.difficultyBias)) {
    return NextResponse.json({ code: 'INVALID_BIAS', message: 'difficultyBias must be gentle, normal or hard' }, { status: 400 });
  }

  const { rows: existingRows } = await query(`SELECT * FROM learner_profile WHERE learner_id = $1`, [LEARNER_ID]);
  if (existingRows.length === 0) {
    return NextResponse.json({ code: 'PROFILE_NOT_FOUND', message: 'No profile row for this learner' }, { status: 404 });
  }
  const current = toJson(existingRows[0]);
  const next = { ...current, ...body };

  await query(
    `UPDATE learner_profile
        SET language = $1, daily_goal_minutes = $2, preferred_time = $3, rest_day = $4, difficulty_bias = $5, updated_at = now()
      WHERE learner_id = $6`,
    [next.language, next.dailyGoalMinutes, next.preferredTime, next.restDay, next.difficultyBias, LEARNER_ID]
  );

  return NextResponse.json(next);
}
