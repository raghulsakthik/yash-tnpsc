import { NextResponse } from 'next/server';
import { query, LEARNER_ID, recordEvent } from '../../../../lib/db.mjs';
import { selectQuestion } from '../../../../domain/selection.mjs';
import { difficultyBand } from '../../../../domain/difficulty.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/revision/next
 *
 * "Memory Echo" — serves a question from whichever topic is most overdue in
 * revision_schedule, or 404 NOTHING_DUE if nothing is. Mirrors
 * /api/questions/next except the topic comes from the schedule, not a
 * query param.
 */
export async function GET() {
  try {
    const { rows: dueRows } = await query(
      `SELECT rs.topic_id, t.name AS topic_name, lts.current_difficulty::float8 AS current_difficulty
         FROM revision_schedule rs
         JOIN topic t ON t.id = rs.topic_id
         LEFT JOIN learner_topic_state lts ON lts.learner_id = rs.learner_id AND lts.topic_id = rs.topic_id
        WHERE rs.learner_id = $1 AND rs.scheduled_at <= now()
        ORDER BY rs.scheduled_at ASC
        LIMIT 1`,
      [LEARNER_ID]
    );

    if (dueRows.length === 0) {
      return NextResponse.json(
        { code: 'NOTHING_DUE', message: 'Nothing is due for review right now' },
        { status: 404 }
      );
    }

    const { topic_id: topicId, topic_name: topicName, current_difficulty } = dueRows[0];
    const targetDifficulty = Number(current_difficulty ?? 0.3);

    const { rows: candidates } = await query(
      `SELECT q.id,
              q.prompt,
              q.options,
              q.difficulty::float8          AS difficulty,
              q.estimated_seconds,
              q.source,
              COUNT(a.id)::int              AS seen_count,
              COALESCE(
                (SELECT COUNT(*) FROM question_attempt a2
                  WHERE a2.learner_id = $1 AND a2.topic_id = $2
                    AND a2.created_at > MAX(a.created_at)), 999
              )::int                        AS attempts_since_last_seen
         FROM question q
         LEFT JOIN question_attempt a
           ON a.question_id = q.id AND a.learner_id = $1
        WHERE q.topic_id = $2 AND q.status = 'PUBLISHED'
        GROUP BY q.id`,
      [LEARNER_ID, topicId]
    );

    if (candidates.length === 0) {
      return NextResponse.json(
        { code: 'NO_QUESTIONS', message: `No published questions for ${topicId}` },
        { status: 404 }
      );
    }

    const chosen = selectQuestion(
      candidates.map((c) => ({
        ...c,
        seenCount: c.seen_count,
        attemptsSinceLastSeen: c.attempts_since_last_seen,
      })),
      targetDifficulty
    );

    await recordEvent(LEARNER_ID, 'REVISION_QUESTION_VIEWED', topicId, { questionId: chosen.id });

    return NextResponse.json({
      questionId: chosen.id,
      topicId,
      topicName,
      prompt: chosen.prompt,
      options: chosen.options,
      estimatedSeconds: chosen.estimated_seconds,
      difficulty: difficultyBand(chosen.difficulty),
      targetDifficulty,
    });
  } catch (err) {
    return NextResponse.json(
      { code: 'REVISION_NEXT_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
