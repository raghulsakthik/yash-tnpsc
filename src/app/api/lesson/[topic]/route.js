import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { getLesson as getHardcodedLesson } from '../../../../domain/lessons.mjs';
import { query } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lesson/:topic -- the real concept + worked example for a topic,
 * plus any admin-uploaded study-resource notes for it (see topic_resource,
 * grown via the admin PDF-upload pipeline). A topic with resources but no
 * lesson still returns 200 -- that's the "new topic from a PDF, no lesson
 * written yet" case.
 *
 * The DB `lesson` table (admin-editable, see /admin/lessons) is the real
 * source of truth; the hardcoded LESSONS object is a fallback only, for
 * any topic that somehow isn't in the DB yet.
 */
export async function GET(request, { params }) {
  const { topic } = await params;

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const { rows: lessonRows } = await query(
    `SELECT title, concept, example_problem, example_steps, example_answer, tip FROM lesson WHERE topic_id = $1`,
    [topic]
  );

  let lesson = null;
  if (lessonRows.length > 0) {
    const r = lessonRows[0];
    lesson = {
      title: r.title,
      concept: r.concept,
      example: { problem: r.example_problem, steps: r.example_steps, answer: r.example_answer },
      tip: r.tip,
    };
  } else {
    lesson = getHardcodedLesson(topic);
  }

  const { rows: resourceRows } = await query(
    `SELECT title, body, image_data, created_at FROM topic_resource WHERE topic_id = $1 ORDER BY created_at DESC`,
    [topic]
  );
  const resources = resourceRows.map((r) => ({ title: r.title, body: r.body, imageData: r.image_data, addedAt: r.created_at }));

  if (!lesson && resources.length === 0) {
    return NextResponse.json({ code: 'LESSON_NOT_FOUND', message: `No lesson for ${topic}` }, { status: 404 });
  }

  return NextResponse.json({ topic, ...lesson, resources });
}
