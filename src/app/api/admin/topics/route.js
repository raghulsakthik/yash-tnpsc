import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnSubject } from '../../../../lib/permissions.mjs';
import { createTopic, ContentUploadError } from '../../../../lib/adminContent.mjs';
import { query } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/topics -- syllabus topics visible to the authenticated question admin. */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.QUESTION_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Question read permission required' }, { status: 403 });
  try {
    const { rows } = await query(`
      SELECT t.id AS "topicId",t.name AS "topicName",c.id AS "chapterId",c.name AS "chapterName",
             s.id AS "subjectId",s.name AS "subjectName"
        FROM topic t JOIN chapter c ON c.id=t.chapter_id
        JOIN subject s ON s.id=c.subject_id
       ORDER BY s.sort_order,c.sort_order,t.sort_order,t.name
    `);
    const allowed = new Set();
    for (const subjectId of [...new Set(rows.map((row) => row.subjectId))]) {
      if (await canActOnSubject(admin, PERMISSIONS.QUESTION_READ, subjectId)) allowed.add(subjectId);
    }
    return NextResponse.json({ topics: rows.filter((row) => allowed.has(row.subjectId)) });
  } catch (err) {
    return NextResponse.json({ code: 'TOPIC_LIST_FAILED', message: err.message }, { status: 500 });
  }
}

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
