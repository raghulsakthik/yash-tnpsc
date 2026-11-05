import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic, isSubjectScoped } from '../../../../lib/permissions.mjs';
import { listQuestionsByTopic, listAllQuestions, createQuestion } from '../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../lib/adminContent.mjs';
import { isQuestionStatus, questionStatusPermission, canCreateQuestionWithStatus } from '../../../../lib/adminQuestionWorkflow.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/questions?topic=aptitude.fractions -- one topic's
 * questions (the per-lesson editor view).
 * GET /api/admin/questions (optionally ?search=&status=&limit=&offset=)
 * -- cross-topic browse for unscoped question admins. Subject experts must
 * provide a topic ID so the server can enforce their assigned subject scope.
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

  if (isSubjectScoped(admin, PERMISSIONS.QUESTION_READ)) {
    return NextResponse.json({ code: 'TOPIC_REQUIRED', message: 'Select a syllabus topic to browse questions within your assigned subject scope.' }, { status: 400 });
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
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Question create permission required' }, { status: 403 });
  try {
    const body = await request.json();
    const status = body.status ?? 'DRAFT';
    if (!isQuestionStatus(status) || !canCreateQuestionWithStatus(status)) {
      return NextResponse.json({ code: 'INVALID_STATUS', message: 'New questions may be saved as DRAFT, submitted IN_REVIEW, or published with permission.' }, { status: 400 });
    }
    if (status !== 'DRAFT') {
      const transitionPermission = questionStatusPermission(status);
      if (!(await requirePermission(request, transitionPermission))) {
        return NextResponse.json({ code: 'FORBIDDEN_STATUS_TRANSITION', message: `Permission ${transitionPermission} is required for status ${status}.` }, { status: 403 });
      }
    }
    if (!(await canActOnTopic(admin, PERMISSIONS.QUESTION_CREATE, body.topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
    const id = await createQuestion({ ...body, status });
    return NextResponse.json({ id, status }, { status: 201 });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
