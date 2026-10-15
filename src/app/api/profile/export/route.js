import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/export
 *
 * Everything this instance knows about the one learner, as one JSON
 * download — one query per table already scoped to LEARNER_ID, no new
 * aggregation logic.
 */
export async function GET() {
  const [profile, topicState, attempts, tests, milestones] = await Promise.all([
    query(`SELECT * FROM learner_profile WHERE learner_id = $1`, [LEARNER_ID]),
    query(`SELECT * FROM learner_topic_state WHERE learner_id = $1`, [LEARNER_ID]),
    query(
      `SELECT question_id, topic_id, selected_index, correct, time_taken_ms, confidence, mistake_type, created_at
         FROM question_attempt WHERE learner_id = $1 ORDER BY created_at`,
      [LEARNER_ID]
    ),
    query(`SELECT id, status, question_count, score, started_at, completed_at FROM test WHERE learner_id = $1`, [LEARNER_ID]),
    query(`SELECT milestone_id, earned_at FROM learner_milestone WHERE learner_id = $1`, [LEARNER_ID]),
  ]);

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile: profile.rows[0] ?? null,
      topicState: topicState.rows,
      attempts: attempts.rows,
      tests: tests.rows,
      milestones: milestones.rows,
    },
    null,
    2
  );

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="nova-export.json"',
    },
  });
}
