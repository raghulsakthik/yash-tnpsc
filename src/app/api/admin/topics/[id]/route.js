import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../../lib/permissions.mjs';
import { query } from '../../../../../lib/db.mjs';
import { updateTopic, deleteTopic } from '../../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.TOPIC_UPDATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;
  try {
    if (!(await canActOnTopic(admin, PERMISSIONS.TOPIC_UPDATE, id))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
    await updateTopic(id, await request.json());
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'UPDATE_FAILED', message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.TOPIC_DELETE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;
  try {
    if (!(await canActOnTopic(admin, PERMISSIONS.TOPIC_DELETE, id))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
    await deleteTopic(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'DELETE_FAILED', message: err.message }, { status: 500 });
  }
}
