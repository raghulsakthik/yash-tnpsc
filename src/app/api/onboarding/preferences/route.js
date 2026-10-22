import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/** Save onboarding preferences without fabricating diagnostic performance. */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'BAD_JSON' }, { status: 400 }); }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;
    const phoneProvided = typeof body.phone === 'string';
    const phone = phoneProvided ? body.phone.trim() : null;
    const dailyGoalMinutes = Number.isInteger(body.dailyGoalMinutes) ? Math.max(15, Math.min(body.dailyGoalMinutes, 720)) : null;
    const language = body.language === 'ta' ? 'ta' : null;
    if (name) await client.query('UPDATE learner SET name=$2 WHERE id=$1', [learnerId, name]);
    await client.query(`UPDATE learner_profile SET phone=CASE WHEN $2::boolean THEN $3 ELSE phone END, language=COALESCE($4,language), daily_goal_minutes=COALESCE($5,daily_goal_minutes), onboarded=true, updated_at=now() WHERE learner_id=$1`, [learnerId, phoneProvided, phone, language, dailyGoalMinutes]);
    await client.query('COMMIT');
    return NextResponse.json({ saved: true, name, phone: phoneProvided ? phone : undefined, language: language || undefined, dailyGoalMinutes: dailyGoalMinutes ?? undefined });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ code: 'ONBOARDING_PREFERENCES_FAILED', message: err.message }, { status: 500 });
  } finally { client.release(); }
}
