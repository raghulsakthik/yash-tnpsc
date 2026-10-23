import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../../lib/permissions.mjs';
import { getLessonForEdit, upsertLesson, deleteLesson } from '../../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../../lib/adminContent.mjs';

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
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_UPDATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { topicId } = await params;
  try {
    if (!(await canActOnTopic(admin, PERMISSIONS.CONTENT_UPDATE, topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
    await upsertLesson(topicId, await request.json());
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'SAVE_FAILED', message: err.message }, { status: 500 });
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
