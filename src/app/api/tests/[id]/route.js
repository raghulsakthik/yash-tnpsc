import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { difficultyBand } from '../../../../domain/difficulty.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tests/:id
 *
 * Full test state for resuming: every question (no answer keys while
 * IN_PROGRESS), her answers and marks so far, and the test's status/score.
 */
export async function GET(request, { params }) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  const { id } = await params;

  try {
    const { rows: testRows } = await query(
      `SELECT id, status, question_count, score::float8 AS score, started_at, completed_at FROM test WHERE id = $1 AND learner_id = $2`,
      [id, learnerId]
    );
    if (testRows.length === 0) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: `No test ${id}` }, { status: 404 });
    }
    const test = testRows[0];

    const { rows: questions } = await query(
      `SELECT tq.order_index, q.id AS question_id, q.topic_id, t.name AS topic_name,
              q.prompt, q.options, q.image_data, q.difficulty::float8 AS difficulty, q.estimated_seconds,
              q.answer_index, q.explanation, q.trap
         FROM test_question tq
         JOIN question q ON q.id = tq.question_id
         JOIN topic t ON t.id = q.topic_id
        WHERE tq.test_id = $1
        ORDER BY tq.order_index`,
      [id]
    );

    const { rows: answers } = await query(
      `SELECT question_id, selected_index, marked_for_review, time_taken_ms FROM test_answer WHERE test_id = $1`,
      [id]
    );
    const answerByQuestion = new Map(answers.map((a) => [a.question_id, a]));

    const revealAnswers = test.status === 'COMPLETED';

    return NextResponse.json({
      testId: test.id,
      status: test.status,
      questionCount: test.question_count,
      score: test.score,
      questions: questions.map((q) => {
        const answer = answerByQuestion.get(q.question_id);
        return {
          questionId: q.question_id,
          topicId: q.topic_id,
          topicName: q.topic_name,
          prompt: q.prompt,
          options: q.options,
          imageData: q.image_data,
          difficulty: difficultyBand(q.difficulty),
          estimatedSeconds: q.estimated_seconds,
          selectedIndex: answer?.selected_index ?? null,
          markedForReview: answer?.marked_for_review ?? false,
          ...(revealAnswers
            ? { correctIndex: q.answer_index, explanation: q.explanation, trap: q.trap }
            : {}),
        };
      }),
    });
  } catch (err) {
    // Covers malformed ids too: "id" is a uuid column, so a non-uuid string
    // throws at the database rather than returning zero rows.
    return NextResponse.json({ code: 'TEST_NOT_FOUND', message: `No test ${id}` }, { status: 404 });
  }
}
