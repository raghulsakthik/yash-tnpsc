import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/quick-lab/stats -- real Quick Lab performance for the signed-in learner. */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE event = 'QUICKLAB_ANSWERED')::int AS attempts,
        COUNT(*) FILTER (WHERE event = 'QUICKLAB_ANSWERED' AND COALESCE((metadata->>'correct')::boolean, false))::int AS correct,
        MAX(created_at) AS last_attempt_at,
        ROUND(AVG(NULLIF((metadata->>'timeTakenMs')::numeric, 0)))::int AS avg_time_ms
      FROM learning_event
      WHERE learner_id = $1 AND event = 'QUICKLAB_ANSWERED'`, [learnerId]);
    const { rows: modeRows } = await query(`
      SELECT metadata->>'mode' AS mode,
             COUNT(*)::int AS attempts,
             COUNT(*) FILTER (WHERE COALESCE((metadata->>'correct')::boolean, false))::int AS correct,
             ROUND(AVG(NULLIF((metadata->>'timeTakenMs')::numeric, 0)))::int AS avg_time_ms
      FROM learning_event
      WHERE learner_id = $1 AND event = 'QUICKLAB_ANSWERED'
      GROUP BY metadata->>'mode'
      ORDER BY attempts DESC`, [learnerId]);
    const attempts = Number(rows[0]?.attempts ?? 0);
    const correct = Number(rows[0]?.correct ?? 0);
    const modes = modeRows.map((r) => ({ mode: r.mode, attempts: Number(r.attempts), correct: Number(r.correct), accuracy: Number(r.attempts) ? Math.round((Number(r.correct) / Number(r.attempts)) * 100) : 0, avgTimeMs: r.avg_time_ms == null ? null : Number(r.avg_time_ms) }));
    return NextResponse.json({ attempts, correct, accuracy: attempts ? Math.round((correct / attempts) * 100) : 0, lastAttemptAt: rows[0]?.last_attempt_at ?? null, avgTimeMs: rows[0]?.avg_time_ms == null ? null : Number(rows[0].avg_time_ms), modes });
  } catch (err) {
    return NextResponse.json({ code: 'QUICKLAB_STATS_FAILED', message: err.message }, { status: 500 });
  }
}
