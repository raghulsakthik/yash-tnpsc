import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';
import { masteryState } from '../../../../domain/mastery.mjs';
import { recommendedAction } from '../../../../domain/recommendedAction.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/revision/due
 *
 * Every topic currently due for review, most overdue first — the list
 * behind the "Due today" view. Same join as /api/revision/next, just
 * without the LIMIT 1: no new selection logic, only more rows of it.
 */
export async function GET() {
  try {
    const { rows } = await query(
      `SELECT rs.topic_id, t.name AS topic_name, rs.scheduled_at, rs.interval_days::float8 AS interval_days,
              lts.retention_score::float8 AS retention, lts.mastery_score::float8 AS mastery, lts.attempt_count
         FROM revision_schedule rs
         JOIN topic t ON t.id = rs.topic_id
         LEFT JOIN learner_topic_state lts ON lts.learner_id = rs.learner_id AND lts.topic_id = rs.topic_id
        WHERE rs.learner_id = $1 AND rs.scheduled_at <= now()
        ORDER BY rs.scheduled_at ASC`,
      [LEARNER_ID]
    );

    return NextResponse.json({
      items: rows.map((r) => ({
        topicId: r.topic_id,
        topicName: r.topic_name,
        scheduledAt: r.scheduled_at,
        intervalDays: r.interval_days,
        retentionPct: Math.round((r.retention ?? 0) * 100),
        // Every item here has a revision_schedule row, which only exists
        // after a first attempt — bankQuestionCount is irrelevant to that,
        // so this always resolves to one of the attempted-topic tiers.
        state: masteryState(r.mastery ?? 0, r.attempt_count ?? 1, 1),
        recommendedAction: recommendedAction({ revisionDue: true, started: true }),
      })),
    });
  } catch (err) {
    return NextResponse.json({ code: 'REVISION_DUE_FAILED', message: err.message }, { status: 500 });
  }
}
