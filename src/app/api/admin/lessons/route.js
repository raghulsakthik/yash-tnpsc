import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnSubject } from '../../../../lib/permissions.mjs';
import { listLessonsByTopic } from '../../../../lib/adminCrud.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/lessons -- every topic, with whether it already has a lesson. */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    const topics = await listLessonsByTopic();
    const allowedSubjectIds = new Set();
    for (const subjectId of [...new Set(topics.map((topic) => topic.subjectId))]) {
      if (await canActOnSubject(admin, PERMISSIONS.CONTENT_READ, subjectId)) allowedSubjectIds.add(subjectId);
    }
    return NextResponse.json({ topics: topics.filter((topic) => allowedSubjectIds.has(topic.subjectId)) });
  } catch (err) {
    return NextResponse.json({ code: 'LIST_FAILED', message: err.message }, { status: 500 });
  }
}
