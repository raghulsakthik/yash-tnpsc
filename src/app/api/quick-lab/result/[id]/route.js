import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../../lib/db.mjs';
import { QUICK_LAB_MODES } from '../../../../../domain/quickLab.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quick-lab/result/:id
 *
 * Final stats for a completed round — the Quick Lab result screen.
 */
export async function GET(request, { params }) {
  const { id } = await params;

  const { rows } = await query(
    `SELECT mode, topic_id, status, question_count, correct_count, best_combo, total_time_ms, started_at, completed_at
       FROM quick_lab_session WHERE id = $1 AND learner_id = $2`,
    [id, LEARNER_ID]
  );
  if (rows.length === 0) {
    return NextResponse.json({ code: 'SESSION_NOT_FOUND', message: `No Quick Lab session ${id}` }, { status: 404 });
  }
  const s = rows[0];
  const mode = QUICK_LAB_MODES[s.mode];

  return NextResponse.json({
    sessionId: id,
    mode: s.mode,
    modeName: mode?.name ?? s.mode,
    status: s.status,
    questionCount: s.question_count,
    correctCount: s.correct_count,
    accuracyPct: s.question_count > 0 ? Math.round((s.correct_count / s.question_count) * 100) : 0,
    bestCombo: s.best_combo,
    avgSeconds: s.question_count > 0 ? Number((s.total_time_ms / s.question_count / 1000).toFixed(1)) : 0,
    xp: s.correct_count * 10,
  });
}
