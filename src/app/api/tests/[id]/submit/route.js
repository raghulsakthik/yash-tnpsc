import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { pool, LEARNER_ID, recordEvent } from '../../../../../lib/db.mjs';
import { recordAttempt } from '../../../../../lib/attempts.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tests/:id/submit
 *
 * Finalizes the test in one transaction: every answered question runs
 * through the same recordAttempt pipeline practice and revision use (mode
 * 'TEST'), so mastery, difficulty and the revision schedule all update from
 * test performance too. An unanswered question counts against the score
 * but is not recorded as a graded attempt — there's no real signal in a
 * blank. Returns the per-topic breakdown and the question-by-question
 * review, safe to reveal now that the test is over.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  const client = await pool.connect();

  try {
    const { rows: testRows } = await client.query(`SELECT status, question_count FROM test WHERE id = $1`, [id]);
    if (testRows.length === 0) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: `No test ${id}` }, { status: 404 });
    }
    if (testRows[0].status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { code: 'TEST_COMPLETED', message: 'This test has already been submitted' },
        { status: 409 }
      );
    }

    const { rows: questions } = await client.query(
      `SELECT tq.order_index, q.id AS question_id, q.topic_id, t.name AS topic_name,
              q.prompt, q.options, q.answer_index, q.explanation, q.trap, q.estimated_seconds
         FROM test_question tq
         JOIN question q ON q.id = tq.question_id
         JOIN topic t ON t.id = q.topic_id
        WHERE tq.test_id = $1
        ORDER BY tq.order_index`,
      [id]
    );

    const { rows: answers } = await client.query(
      `SELECT question_id, selected_index, time_taken_ms, marked_for_review FROM test_answer WHERE test_id = $1`,
      [id]
    );
    const answerByQuestion = new Map(answers.map((a) => [a.question_id, a]));

    await client.query('BEGIN');

    let correctCount = 0;
    const perTopic = new Map();
    const review = [];

    for (const q of questions) {
      const answer = answerByQuestion.get(q.question_id);
      const answered = answer && answer.selected_index !== null && answer.selected_index !== undefined;
      let correct = false;

      if (answered) {
        const result = await recordAttempt({
          client,
          learnerId: LEARNER_ID,
          questionId: q.question_id,
          attemptId: crypto.randomUUID(),
          selectedIndex: answer.selected_index,
          timeTakenMs: answer.time_taken_ms ?? 0,
          confidence: null,
          mode: 'TEST',
        });
        correct = result.correct;
      }

      if (correct) correctCount += 1;

      if (!perTopic.has(q.topic_id)) perTopic.set(q.topic_id, { topicId: q.topic_id, topicName: q.topic_name, correct: 0, total: 0 });
      const t = perTopic.get(q.topic_id);
      t.total += 1;
      if (correct) t.correct += 1;

      review.push({
        questionId: q.question_id,
        topicName: q.topic_name,
        prompt: q.prompt,
        options: q.options,
        selectedIndex: answered ? answer.selected_index : null,
        correctIndex: q.answer_index,
        correct,
        markedForReview: answer?.marked_for_review ?? false,
        explanation: q.explanation,
        trap: correct ? null : q.trap,
      });
    }

    const score = (correctCount / questions.length) * 100;

    await client.query(
      `UPDATE test SET status = 'COMPLETED', completed_at = now(), score = $1 WHERE id = $2`,
      [score.toFixed(2), id]
    );

    await client.query('COMMIT');

    await recordEvent(LEARNER_ID, 'TEST_COMPLETED', null, {
      testId: id,
      score,
      questionCount: questions.length,
      correctCount,
    });

    return NextResponse.json({
      testId: id,
      score: Number(score.toFixed(2)),
      correctCount,
      questionCount: questions.length,
      perTopic: [...perTopic.values()].sort((a, b) => a.correct / a.total - b.correct / b.total),
      review,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ code: 'TEST_SUBMIT_FAILED', message: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
