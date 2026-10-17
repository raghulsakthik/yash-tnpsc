import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { getLesson } from '../../../../domain/lessons.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/lesson/:topic -- the real concept + worked example for a topic. */
export async function GET(request, { params }) {
  const { topic } = await params;

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const lesson = getLesson(topic);
  if (!lesson) {
    return NextResponse.json({ code: 'LESSON_NOT_FOUND', message: `No lesson for ${topic}` }, { status: 404 });
  }

  return NextResponse.json({ topic, ...lesson });
}
