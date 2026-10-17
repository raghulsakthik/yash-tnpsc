import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { getQuestion, updateQuestion, deleteQuestion } from '../../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;
  try {
    const question = await getQuestion(id);
    if (!question) return NextResponse.json({ code: 'QUESTION_NOT_FOUND', message: `No question ${id}` }, { status: 404 });
    return NextResponse.json(question);
  } catch (err) {
    return NextResponse.json({ code: 'GET_FAILED', message: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;
  try {
    await updateQuestion(id, await request.json());
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'UPDATE_FAILED', message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;
  try {
    await deleteQuestion(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'DELETE_FAILED', message: err.message }, { status: 500 });
  }
}
