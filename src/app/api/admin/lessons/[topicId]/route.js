import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../../lib/permissions.mjs';
import { getLessonForEdit, upsertLesson, deleteLesson, setLessonStatus } from '../../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../../lib/adminContent.mjs';
import { isLessonStatus, lessonTransitionPermission } from '../../../../../lib/adminLessonWorkflow.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { topicId } = await params;
  try {
    if (!(await canActOnTopic(admin, PERMISSIONS.CONTENT_READ, topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
    const lesson = await getLessonForEdit(topicId);
    if (!lesson) return NextResponse.json({ code: 'LESSON_NOT_FOUND', message: `No lesson for ${topicId}` }, { status: 404 });
    return NextResponse.json(lesson);
  } catch (err) {
    return NextResponse.json({ code: 'GET_FAILED', message: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Content read permission required' }, { status: 403 });
  const { topicId } = await params;
  try {
    const existing = await getLessonForEdit(topicId);
    const mutationPermission = existing ? PERMISSIONS.CONTENT_UPDATE : PERMISSIONS.CONTENT_CREATE;
    if (!(await requirePermission(request, mutationPermission)) ||
        !(await canActOnTopic(admin, mutationPermission, topicId))) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Content create/update permission and subject scope are required' }, { status: 403 });
    }
    const body = await request.json();
    const nextStatus = body.status ?? existing?.status ?? 'DRAFT';
    if (!isLessonStatus(nextStatus) || (!existing && nextStatus === 'ARCHIVED')) {
      return NextResponse.json({ code: 'INVALID_STATUS', message: 'Unsupported initial or lesson status' }, { status: 400 });
    }
    const transitionPermission = lessonTransitionPermission(existing?.status, nextStatus);
    if (transitionPermission && (!(await requirePermission(request, transitionPermission)) ||
        !(await canActOnTopic(admin, transitionPermission, topicId)))) {
      return NextResponse.json({ code: 'FORBIDDEN_STATUS_TRANSITION', message: `Permission ${transitionPermission} is required for status ${nextStatus}.` }, { status: 403 });
    }
    await upsertLesson(topicId, { ...body, status: nextStatus });
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'SAVE_FAILED', message: err.message }, { status: 500 });
  }
}

/** PATCH -- status-only transition (submit for review / approve / publish / archive), body: { status }. */
export async function PATCH(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_UPDATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Content update permission required' }, { status: 403 });
  const { topicId } = await params;
  try {
    if (!(await canActOnTopic(admin, PERMISSIONS.CONTENT_UPDATE, topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
    const existing = await getLessonForEdit(topicId);
    if (!existing) return NextResponse.json({ code: 'LESSON_NOT_FOUND', message: `No lesson for ${topicId}` }, { status: 404 });
    const body = await request.json();
    if (!isLessonStatus(body.status)) return NextResponse.json({ code: 'INVALID_STATUS', message: 'Unsupported lesson status' }, { status: 400 });
    const transitionPermission = lessonTransitionPermission(existing.status, body.status);
    if (transitionPermission && (!(await requirePermission(request, transitionPermission)) ||
        !(await canActOnTopic(admin, transitionPermission, topicId)))) {
      return NextResponse.json({ code: 'FORBIDDEN_STATUS_TRANSITION', message: `Permission ${transitionPermission} is required for status ${body.status}.` }, { status: 403 });
    }
    await setLessonStatus(topicId, body.status);
    return NextResponse.json({ ok: true, status: body.status });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'STATUS_UPDATE_FAILED', message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_DELETE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { topicId } = await params;
  try {
    if (!(await canActOnTopic(admin, PERMISSIONS.CONTENT_DELETE, topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
    await deleteLesson(topicId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'DELETE_FAILED', message: err.message }, { status: 500 });
  }
}
