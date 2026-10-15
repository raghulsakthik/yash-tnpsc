import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';
import { selectQuestion } from '../../../../domain/selection.mjs';
import { difficultyBand, applyDifficultyBias } from '../../../../domain/difficulty.mjs';

export const dynamic = 'force-dynamic';

async function candidatesForTopic(topicId) {
  const [{ rows: stateRows }, { rows: profileRows }] = await Promise.all([
    query(
      `SELECT current_difficulty::float8 AS current_difficulty
         FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
      [LEARNER_ID, topicId]
    ),
    query(`SELECT difficulty_bias FROM learner_profile WHERE learner_id = $1`, [LEARNER_ID]),
  ]);
  const targetDifficulty = applyDifficultyBias(
    Number(stateRows[0]?.current_difficulty ?? 0.3),
    profileRows[0]?.difficulty_bias
  );

  const { rows: candidates } = await query(
    `SELECT q.id, q.prompt, q.options, q.difficulty::float8 AS difficulty, q.estimated_seconds,
            q.source, q.source_year, t.name AS topic_name,
            COUNT(a.id)::int AS seen_count,
            COALESCE(
              (SELECT COUNT(*) FROM question_attempt a2
                WHERE a2.learner_id = $1 AND a2.topic_id = $2
                  AND a2.created_at > MAX(a.created_at)), 999
            )::int AS attempts_since_last_seen
       FROM question q
       JOIN topic t ON t.id = q.topic_id
       LEFT JOIN question_attempt a ON a.question_id = q.id AND a.learner_id = $1
      WHERE q.topic_id = $2 AND q.status = 'PUBLISHED' AND q.source LIKE 'tnpsc-%'
      GROUP BY q.id, t.name`,
    [LEARNER_ID, topicId]
  );
  return { candidates, targetDifficulty };
}

/**
 * GET /api/pyqs/next?mode=topic&topic=...
 * GET /api/pyqs/next?mode=weak-areas
 * GET /api/pyqs/next?mode=previously-wrong
 *
 * Same selection engine as /api/questions/next (selectQuestion), restricted
 * to real past-paper questions (source LIKE 'tnpsc-%'). Answers post
 * through the existing POST /api/attempts unchanged (mode 'PYQ' — never
 * 'REVISION', so recordAttempt treats it like any other practice attempt).
 */
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get('mode') ?? 'topic';

  try {
    if (mode === 'topic') {
      const topicId = params.get('topic');
      if (!topicId) {
        return NextResponse.json({ code: 'TOPIC_REQUIRED', message: 'mode=topic requires ?topic=' }, { status: 400 });
      }
      const { candidates, targetDifficulty } = await candidatesForTopic(topicId);
      if (candidates.length === 0) {
        return NextResponse.json({ code: 'NO_QUESTIONS', message: `No PYQ questions for ${topicId}` }, { status: 404 });
      }
      const chosen = selectQuestion(
        candidates.map((c) => ({ ...c, seenCount: c.seen_count, attemptsSinceLastSeen: c.attempts_since_last_seen })),
        targetDifficulty
      );
      return NextResponse.json({
        questionId: chosen.id,
        topicId,
        topicName: chosen.topic_name,
        prompt: chosen.prompt,
        options: chosen.options,
        estimatedSeconds: chosen.estimated_seconds,
        difficulty: difficultyBand(chosen.difficulty),
        sourceYear: chosen.source_year,
      });
    }

    if (mode === 'weak-areas') {
      const { rows: weakTopics } = await query(
        `SELECT lts.topic_id, lts.accuracy_score::float8 AS accuracy
           FROM learner_topic_state lts
           JOIN (SELECT DISTINCT topic_id FROM question WHERE source LIKE 'tnpsc-%') pyq
             ON pyq.topic_id = lts.topic_id
          WHERE lts.learner_id = $1 AND lts.attempt_count > 0
          ORDER BY lts.accuracy_score ASC
          LIMIT 1`,
        [LEARNER_ID]
      );
      if (weakTopics.length === 0) {
        return NextResponse.json(
          { code: 'NO_WEAK_AREAS', message: 'Not enough attempts yet to tell where you are weak' },
          { status: 404 }
        );
      }
      const topicId = weakTopics[0].topic_id;
      const { candidates, targetDifficulty } = await candidatesForTopic(topicId);
      if (candidates.length === 0) {
        return NextResponse.json({ code: 'NO_QUESTIONS', message: `No PYQ questions for ${topicId}` }, { status: 404 });
      }
      const chosen = selectQuestion(
        candidates.map((c) => ({ ...c, seenCount: c.seen_count, attemptsSinceLastSeen: c.attempts_since_last_seen })),
        targetDifficulty
      );
      return NextResponse.json({
        questionId: chosen.id,
        topicId,
        topicName: chosen.topic_name,
        prompt: chosen.prompt,
        options: chosen.options,
        estimatedSeconds: chosen.estimated_seconds,
        difficulty: difficultyBand(chosen.difficulty),
        sourceYear: chosen.source_year,
      });
    }

    if (mode === 'previously-wrong') {
      const { rows } = await query(
        `WITH wrong AS (
           SELECT DISTINCT ON (qa.question_id) qa.question_id, qa.topic_id, qa.created_at
             FROM question_attempt qa
             JOIN question q ON q.id = qa.question_id
            WHERE qa.learner_id = $1 AND qa.correct = false AND q.source LIKE 'tnpsc-%'
            ORDER BY qa.question_id, qa.created_at DESC
         ),
         resolved AS (
           SELECT DISTINCT w.question_id
             FROM question_attempt qa
             JOIN wrong w ON w.question_id = qa.question_id
            WHERE qa.learner_id = $1 AND qa.correct = true AND qa.created_at > w.created_at
         )
         SELECT w.question_id, w.topic_id, q.prompt, q.options, q.difficulty::float8 AS difficulty,
                q.estimated_seconds, q.source_year, t.name AS topic_name
           FROM wrong w
           LEFT JOIN resolved r ON r.question_id = w.question_id
           JOIN question q ON q.id = w.question_id
           JOIN topic t ON t.id = w.topic_id
          WHERE r.question_id IS NULL
          ORDER BY w.created_at DESC
          LIMIT 1`,
        [LEARNER_ID]
      );
      if (rows.length === 0) {
        return NextResponse.json(
          { code: 'NO_PREVIOUSLY_WRONG', message: 'No open PYQ mistakes right now' },
          { status: 404 }
        );
      }
      const q = rows[0];
      return NextResponse.json({
        questionId: q.question_id,
        topicId: q.topic_id,
        topicName: q.topic_name,
        prompt: q.prompt,
        options: q.options,
        estimatedSeconds: q.estimated_seconds,
        difficulty: difficultyBand(q.difficulty),
        sourceYear: q.source_year,
      });
    }

    return NextResponse.json({ code: 'UNKNOWN_MODE', message: `Unknown PYQ mode: ${mode}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ code: 'PYQS_NEXT_FAILED', message: err.message }, { status: 500 });
  }
}
