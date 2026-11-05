import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../lib/permissions.mjs';
import { listQuestionsByTopic, listAllQuestions, createQuestion } from '../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/questions?topic=aptitude.fractions -- one topic's
 * questions (the per-lesson editor view).
 * GET /api/admin/questions (optionally ?search=&status=&limit=&offset=)
 * -- the real cross-topic question bank browse for the Admin Portal's
 * Questions and Question Review sections.
 */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.QUESTION_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get('topic');

  if (topicId) {
    if (!(await canActOnTopic(admin, PERMISSIONS.QUESTION_READ, topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
    try {
      return NextResponse.json({ questions: await listQuestionsByTopic(topicId) });
    } catch (err) {
      return NextResponse.json({ code: 'LIST_FAILED', message: err.message }, { status: 500 });
    }
  }

  try {
    const result = await listAllQuestions({
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });
    return NextResponse.json(result);
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
