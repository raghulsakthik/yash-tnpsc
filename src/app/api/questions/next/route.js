import { NextResponse } from 'next/server';
import { query, LEARNER_ID, recordEvent } from '../../../../lib/db.mjs';
import { selectQuestion } from '../../../../domain/selection.mjs';
import { difficultyBand } from '../../../../domain/difficulty.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/questions/next?topic=aptitude.fractions
 *
 * The backend decides which question comes next. The frontend displays it.
 * No difficulty logic ever moves to the client.
 */
export async function GET(request) {
  const topicId = new URL(request.url).searchParams.get('topic') ?? 'aptitude.fractions';

  try {
    const { rows: stateRows } = await query(
      `SELECT current_difficulty, attempt_count, next_action
         FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
      [LEARNER_ID, topicId]
    );

    const targetDifficulty = Number(stateRows[0]?.current_difficulty ?? 0.3);

    // Candidates, with how often she has seen each and how long ago.
    const { rows: candidates } = await query(
      `SELECT q.id,
              q.prompt,
              q.options,
              q.difficulty::float8          AS difficulty,
              q.estimated_seconds,
              q.source,
              t.name                         AS topic_name,
              COUNT(a.id)::int              AS seen_count,
              COALESCE(
                (SELECT COUNT(*) FROM question_attempt a2
                  WHERE a2.learner_id = $1 AND a2.topic_id = $2
                    AND a2.created_at > MAX(a.created_at)), 999
              )::int                        AS attempts_since_last_seen
         FROM question q
         JOIN topic t ON t.id = q.topic_id
         LEFT JOIN question_attempt a
           ON a.question_id = q.id AND a.learner_id = $1
        WHERE q.topic_id = $2 AND q.status = 'PUBLISHED'
        GROUP BY q.id, t.name`,
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

    await recordEvent(LEARNER_ID, 'QUESTION_VIEWED', topicId, { questionId: chosen.id });

    // The answer index is deliberately not in this payload.
    return NextResponse.json({
      questionId: chosen.id,
      topicId,
      topicName: chosen.topic_name,
      prompt: chosen.prompt,
      options: chosen.options,
      estimatedSeconds: chosen.estimated_seconds,
      difficulty: difficultyBand(chosen.difficulty),
      targetDifficulty,
      attemptCount: stateRows[0]?.attempt_count ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { code: 'NEXT_QUESTION_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
