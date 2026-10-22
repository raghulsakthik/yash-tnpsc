import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../../lib/permissions.mjs';
import { getQuestion, updateQuestion, deleteQuestion } from '../../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.QUESTION_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;
  try {
    const question = await getQuestion(id);
    if (question && !(await canActOnTopic(admin, PERMISSIONS.QUESTION_READ, question.topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this question' }, { status: 403 });
    if (!question) return NextResponse.json({ code: 'QUESTION_NOT_FOUND', message: `No question ${id}` }, { status: 404 });
    return NextResponse.json(question);
  } catch (err) {
    return NextResponse.json({ code: 'GET_FAILED', message: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.QUESTION_UPDATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;
  try {
    const existing = await getQuestion(id);
    if (!existing) return NextResponse.json({ code: 'QUESTION_NOT_FOUND', message: `No question ${id}` }, { status: 404 });
    if (!(await canActOnTopic(admin, PERMISSIONS.QUESTION_UPDATE, existing.topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this question' }, { status: 403 });
    await updateQuestion(id, await request.json());
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'UPDATE_FAILED', message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.QUESTION_DELETE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;
  try {
    const existing = await getQuestion(id);
    if (!existing) return NextResponse.json({ code: 'QUESTION_NOT_FOUND', message: `No question ${id}` }, { status: 404 });
    if (!(await canActOnTopic(admin, PERMISSIONS.QUESTION_DELETE, existing.topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this question' }, { status: 403 });
    await deleteQuestion(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'DELETE_FAILED', message: err.message }, { status: 500 });
  }
}
