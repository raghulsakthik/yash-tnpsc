import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';
import { QUICK_LAB_MODES } from '../../../../domain/quickLab.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quick-lab/modes
 *
 * Best completed round per bank-backed mode — the stat line each mode
 * card shows ("Best 92% · 8.4s avg"). A mode with no completed rounds yet
 * returns null stats, same as the design's "new · no score yet".
 */
export async function GET() {
  try {
    const modes = await Promise.all(
      Object.entries(QUICK_LAB_MODES).map(async ([slug, mode]) => {
        const { rows } = await query(
          `SELECT question_count, correct_count, best_combo, total_time_ms
             FROM quick_lab_session
            WHERE learner_id = $1 AND mode = $2 AND status = 'COMPLETED'
            ORDER BY (correct_count::float8 / NULLIF(question_count, 0)) DESC
            LIMIT 1`,
          [LEARNER_ID, slug]
        );

        const best = rows[0];
        return {
          slug,
          name: mode.name,
          topicId: mode.topicId,
          roundLength: mode.roundLength,
          best: best
            ? {
                accuracyPct: Math.round((best.correct_count / best.question_count) * 100),
                bestCombo: best.best_combo,
                avgSeconds: Number((best.total_time_ms / best.question_count / 1000).toFixed(1)),
              }
            : null,
        };
      })
    );

    return NextResponse.json({ items: modes });
  } catch (err) {
    return NextResponse.json({ code: 'QUICK_LAB_MODES_FAILED', message: err.message }, { status: 500 });
  }
}
