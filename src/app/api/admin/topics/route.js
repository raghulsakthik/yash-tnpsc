import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnSubject } from '../../../../lib/permissions.mjs';
import { createTopic, ContentUploadError } from '../../../../lib/adminContent.mjs';
import { query } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/** POST /api/admin/topics -- create a topic directly under an existing chapter. */
export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.TOPIC_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    const body = await request.json();
    const { rows } = await query('SELECT subject_id FROM chapter WHERE id=$1', [body.chapterId]);
    if (!rows.length || !(await canActOnSubject(admin, PERMISSIONS.TOPIC_CREATE, rows[0].subject_id))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this chapter' }, { status: 403 });
    await createTopic({ topicId: body.id, topicName: body.name, chapterId: body.chapterId });
    return NextResponse.json({ id: body.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
