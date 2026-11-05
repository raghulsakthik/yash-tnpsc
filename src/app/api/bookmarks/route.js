import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';
import { requireLearnerId } from '../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/bookmarks -- every saved question, newest first, with topic context for display. */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const { rows } = await query(
      `SELECT qb.question_id, qb.created_at, q.prompt, q.options, q.answer_index, q.explanation, q.trap,
              q.topic_id, t.name AS topic_name
         FROM question_bookmark qb
         JOIN question q ON q.id = qb.question_id
         JOIN topic t ON t.id = q.topic_id
        WHERE qb.learner_id = $1
        ORDER BY qb.created_at DESC`,
      [learnerId]
    );

    return NextResponse.json({
      bookmarks: rows.map((r) => ({
        questionId: r.question_id,
        savedAt: r.created_at,
        topicId: r.topic_id,
        topicName: r.topic_name,
        prompt: r.prompt,
        options: r.options,
        correctIndex: r.answer_index,
        explanation: r.explanation,
        trap: r.trap,
      })),
    });
  } catch (err) {
    return NextResponse.json({ code: 'BOOKMARKS_FAILED', message: err.message }, { status: 500 });
  }
}

/** POST /api/bookmarks -- body: { questionId }. Idempotent. */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  if (!body.questionId) {
    return NextResponse.json({ code: 'MISSING_QUESTION_ID', message: 'questionId is required' }, { status: 400 });
  }

  try {
    await query(
      `INSERT INTO question_bookmark (learner_id, question_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [learnerId, body.questionId]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ code: 'BOOKMARK_FAILED', message: err.message }, { status: 500 });
  }
}

/** DELETE /api/bookmarks -- body: { questionId }. Idempotent. */
export async function DELETE(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  if (!body.questionId) {
    return NextResponse.json({ code: 'MISSING_QUESTION_ID', message: 'questionId is required' }, { status: 400 });
  }

  try {
    await query(`DELETE FROM question_bookmark WHERE learner_id = $1 AND question_id = $2`, [learnerId, body.questionId]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ code: 'UNBOOKMARK_FAILED', message: err.message }, { status: 500 });
  }
}
