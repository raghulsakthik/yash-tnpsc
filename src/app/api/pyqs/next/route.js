import { NextResponse } from 'next/server';
import { query, recordEvent } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { selectQuestion } from '../../../../domain/selection.mjs';
import { difficultyBand } from '../../../../domain/difficulty.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pyqs/next?year=&topic=
 *
 * Same selection logic as /api/questions/next, restricted to real
 * past-year questions (source_year IS NOT NULL) -- the ones actually
 * asked in a real TNPSC paper, not the practice bank. year/topic are both
 * optional filters; omit both for "any past-year question, any topic".
 */
export async function GET(request) {
  const url = new URL(request.url);
  const year = url.searchParams.get('year');
  const topicId = url.searchParams.get('topic');

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const { rows: stateRows } = await query(
      `SELECT AVG(current_difficulty)::float8 AS avg_difficulty FROM learner_topic_state WHERE learner_id = $1`,
      [learnerId]
    );
    const targetDifficulty = Number(stateRows[0]?.avg_difficulty ?? 0.4);

    const conditions = [`q.status = 'PUBLISHED'`, `q.source_year IS NOT NULL`];
    const params = [learnerId];
    if (year) {
      params.push(Number(year));
      conditions.push(`q.source_year = $${params.length}`);
    }
    if (topicId) {
      params.push(topicId);
      conditions.push(`q.topic_id = $${params.length}`);
    }

    const { rows: candidates } = await query(
      `SELECT q.id, q.topic_id, t.name AS topic_name, q.prompt, q.options, q.image_data,
              q.difficulty::float8 AS difficulty, q.estimated_seconds, q.source, q.source_year,
              COUNT(a.id)::int AS seen_count,
              COALESCE(
                (SELECT COUNT(*) FROM question_attempt a2
                  WHERE a2.learner_id = $1 AND a2.topic_id = q.topic_id
                    AND a2.created_at > MAX(a.created_at)), 999
              )::int AS attempts_since_last_seen
         FROM question q
         JOIN topic t ON t.id = q.topic_id
         LEFT JOIN question_attempt a ON a.question_id = q.id AND a.learner_id = $1
        WHERE ${conditions.join(' AND ')}
        GROUP BY q.id, t.name`,
      params
    );

    if (candidates.length === 0) {
      return NextResponse.json({ code: 'NO_QUESTIONS', message: 'No past-year questions match this filter' }, { status: 404 });
    }

    const chosen = selectQuestion(
      candidates.map((c) => ({ ...c, seenCount: c.seen_count, attemptsSinceLastSeen: c.attempts_since_last_seen })),
      targetDifficulty
    );

    await recordEvent(learnerId, 'PYQ_VIEWED', chosen.topic_id, { questionId: chosen.id, year: chosen.source_year });

    return NextResponse.json({
      questionId: chosen.id,
      topicId: chosen.topic_id,
      topicName: chosen.topic_name,
      prompt: chosen.prompt,
      options: chosen.options,
      imageData: chosen.image_data,
      estimatedSeconds: chosen.estimated_seconds,
      difficulty: difficultyBand(chosen.difficulty),
      sourceYear: chosen.source_year,
      source: chosen.source,
    });
  } catch (err) {
    return NextResponse.json({ code: 'PYQ_NEXT_FAILED', message: err.message }, { status: 500 });
  }
}
