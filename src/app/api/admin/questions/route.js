import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../lib/permissions.mjs';
import { listQuestionsByTopic, createQuestion } from '../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/questions?topic=aptitude.fractions */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.QUESTION_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const topicId = new URL(request.url).searchParams.get('topic');
  if (!topicId) return NextResponse.json({ code: 'MISSING_TOPIC', message: 'A `topic` query param is required' }, { status: 400 });
  if (!(await canActOnTopic(admin, PERMISSIONS.QUESTION_READ, topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
  try {
    return NextResponse.json({ questions: await listQuestionsByTopic(topicId) });
  } catch (err) {
    return NextResponse.json({ code: 'LIST_FAILED', message: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.QUESTION_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    const body = await request.json();
    if (!(await canActOnTopic(admin, PERMISSIONS.QUESTION_CREATE, body.topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
    const id = await createQuestion(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
