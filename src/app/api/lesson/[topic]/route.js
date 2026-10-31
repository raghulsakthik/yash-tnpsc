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

  // status = 'PUBLISHED' matters: a lesson an admin has saved as DRAFT,
  // submitted IN_REVIEW, or ARCHIVED is real content mid-edit or
  // withdrawn -- it must never reach a learner just because a row exists
  // for the topic (see db/migrations/V71__lesson_authoring_metadata.sql).
  const { rows: lessonRows } = await query(
    `SELECT title, concept, example_problem, example_steps, example_answer, tip,
            definition, formulas, shortcuts, common_mistakes, content_markdown
       FROM lesson WHERE topic_id = $1 AND status = 'PUBLISHED'`,
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
      definition: r.definition,
      formulas: r.formulas,
      shortcuts: r.shortcuts,
      commonMistakes: r.common_mistakes,
      contentMarkdown: r.content_markdown || null,
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
