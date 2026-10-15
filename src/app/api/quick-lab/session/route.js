import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';
import { selectQuestion } from '../../../../domain/selection.mjs';
import { difficultyBand } from '../../../../domain/difficulty.mjs';
import { QUICK_LAB_MODES } from '../../../../domain/quickLab.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quick-lab/session
 * body: { mode }
 *
 * Starts a round and picks its first question — the exact same candidate
 * query and selectQuestion() call as /api/questions/next, just against the
 * mode's fixed topic instead of a query-param one.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_BODY', message: 'Expected a JSON body' }, { status: 400 });
  }

  const mode = QUICK_LAB_MODES[body.mode];
  if (!mode) {
    return NextResponse.json({ code: 'UNKNOWN_MODE', message: `No such Quick Lab mode: ${body.mode}` }, { status: 404 });
  }

  try {
    const { rows: stateRows } = await query(
      `SELECT current_difficulty::float8 AS current_difficulty
         FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
      [LEARNER_ID, mode.topicId]
    );
    const targetDifficulty = Number(stateRows[0]?.current_difficulty ?? 0.3);

    const { rows: candidates } = await query(
      `SELECT q.id, q.prompt, q.options, q.difficulty::float8 AS difficulty, q.estimated_seconds, q.source,
              COUNT(a.id)::int AS seen_count,
              COALESCE(
                (SELECT COUNT(*) FROM question_attempt a2
                  WHERE a2.learner_id = $1 AND a2.topic_id = $2
                    AND a2.created_at > MAX(a.created_at)), 999
              )::int AS attempts_since_last_seen
         FROM question q
         LEFT JOIN question_attempt a ON a.question_id = q.id AND a.learner_id = $1
        WHERE q.topic_id = $2 AND q.status = 'PUBLISHED'
        GROUP BY q.id`,
      [LEARNER_ID, mode.topicId]
    );

    if (candidates.length === 0) {
      return NextResponse.json({ code: 'NO_QUESTIONS', message: `No published questions for ${mode.topicId}` }, { status: 404 });
    }

    const chosen = selectQuestion(
      candidates.map((c) => ({ ...c, seenCount: c.seen_count, attemptsSinceLastSeen: c.attempts_since_last_seen })),
      targetDifficulty
    );

    const { rows: sessionRows } = await query(
      `INSERT INTO quick_lab_session (learner_id, mode, topic_id) VALUES ($1, $2, $3) RETURNING id`,
      [LEARNER_ID, body.mode, mode.topicId]
    );

    return NextResponse.json({
      sessionId: sessionRows[0].id,
      mode: body.mode,
      roundLength: mode.roundLength,
      question: {
        questionId: chosen.id,
        topicId: mode.topicId,
        prompt: chosen.prompt,
        options: chosen.options,
        difficulty: difficultyBand(chosen.difficulty),
      },
    });
  } catch (err) {
    return NextResponse.json({ code: 'QUICK_LAB_SESSION_FAILED', message: err.message }, { status: 500 });
  }
}
