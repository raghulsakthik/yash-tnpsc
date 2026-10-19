import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';
import { requireLearnerId } from '../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/achievements -- every achievement, with her real unlock status. */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const [{ rows: all }, { rows: unlocked }] = await Promise.all([
      query(`SELECT id, name, description, icon FROM achievement ORDER BY sort_order`),
      query(`SELECT achievement_id, unlocked_at FROM learner_achievement WHERE learner_id = $1`, [learnerId]),
    ]);

    const unlockedById = new Map(unlocked.map((u) => [u.achievement_id, u.unlocked_at]));

    const achievements = all.map((a) => ({
      ...a,
      unlocked: unlockedById.has(a.id),
      unlockedAt: unlockedById.get(a.id) ?? null,
    }));

    return NextResponse.json({
      achievements,
      unlockedCount: unlocked.length,
      totalCount: all.length,
    });
  } catch (err) {
    return NextResponse.json({ code: 'ACHIEVEMENTS_FAILED', message: err.message }, { status: 500 });
  }
}
