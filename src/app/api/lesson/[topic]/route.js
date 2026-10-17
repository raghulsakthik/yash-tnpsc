import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { getLesson } from '../../../../domain/lessons.mjs';
import { query } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lesson/:topic -- the real concept + worked example for a topic,
 * plus any admin-uploaded study-resource notes for it (see topic_resource,
 * grown via the admin PDF-upload pipeline). A topic with resources but no
 * hand-authored lesson still returns 200 -- that's exactly the "new topic
 * from a PDF, no curated lesson yet" case.
 */
export async function GET(request, { params }) {
  const { topic } = await params;

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const lesson = getLesson(topic);

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
