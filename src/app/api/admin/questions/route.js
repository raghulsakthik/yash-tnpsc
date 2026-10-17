import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth.mjs';
import { listQuestionsByTopic, createQuestion } from '../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/questions?topic=aptitude.fractions */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const topicId = new URL(request.url).searchParams.get('topic');
  if (!topicId) return NextResponse.json({ code: 'MISSING_TOPIC', message: 'A `topic` query param is required' }, { status: 400 });
  try {
    return NextResponse.json({ questions: await listQuestionsByTopic(topicId) });
  } catch (err) {
    return NextResponse.json({ code: 'LIST_FAILED', message: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    const id = await createQuestion(await request.json());
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
