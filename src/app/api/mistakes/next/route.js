import { NextResponse } from 'next/server';
import { query, LEARNER_ID, recordEvent } from '../../../../lib/db.mjs';
import { difficultyBand } from '../../../../domain/difficulty.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mistakes/next
 *
 * The most recent still-open mistake: the latest wrong attempt on a
 * question that hasn't since been answered correctly. Same response shape
 * as /api/questions/next so it can be served through the same
 * QuestionSession component. 404 NO_MISTAKES when the bank is empty.
 */
export async function GET() {
  try {
    const { rows } = await query(
      `WITH wrong AS (
         SELECT DISTINCT ON (question_id) question_id, topic_id, created_at
           FROM question_attempt
          WHERE learner_id = $1 AND correct = false
          ORDER BY question_id, created_at DESC
       ),
       resolved AS (
         SELECT DISTINCT w.question_id
           FROM question_attempt qa
           JOIN wrong w ON w.question_id = qa.question_id
          WHERE qa.learner_id = $1 AND qa.correct = true AND qa.created_at > w.created_at
       )
       SELECT w.question_id, w.topic_id
         FROM wrong w
         LEFT JOIN resolved r ON r.question_id = w.question_id
        WHERE r.question_id IS NULL
        ORDER BY w.created_at DESC
        LIMIT 1`,
      [LEARNER_ID]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { code: 'NO_MISTAKES', message: 'No open mistakes right now' },
        { status: 404 }
      );
    }

    const { question_id: questionId, topic_id: topicId } = rows[0];

    const { rows: questionRows } = await query(
      `SELECT q.prompt, q.options, q.difficulty::float8 AS difficulty, q.estimated_seconds, t.name AS topic_name
         FROM question q JOIN topic t ON t.id = q.topic_id
        WHERE q.id = $1`,
      [questionId]
    );
    const q = questionRows[0];

    await recordEvent(LEARNER_ID, 'MISTAKE_REVIEWED', topicId, { questionId });

    return NextResponse.json({
      questionId,
      topicId,
      topicName: q.topic_name,
      prompt: q.prompt,
      options: q.options,
      estimatedSeconds: q.estimated_seconds,
      difficulty: difficultyBand(q.difficulty),
    });
  } catch (err) {
    return NextResponse.json({ code: 'MISTAKES_NEXT_FAILED', message: err.message }, { status: 500 });
  }
}
