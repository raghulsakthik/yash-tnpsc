import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../../../lib/permissions.mjs';
import { ContentReviewError, rollbackLessonVersion } from '../../../../../../lib/contentReview.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Content permission required' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 }); }

  const topicId = typeof body.topicId === 'string' ? body.topicId.trim() : '';
  const versionNumber = Number(body.versionNumber);
  if (!topicId || !Number.isInteger(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ code: 'INVALID_ROLLBACK', message: 'topicId and a positive integer versionNumber are required' }, { status: 400 });
  }
  if (!(await canActOnTopic(admin, PERMISSIONS.CONTENT_CREATE, topicId))) {
    return NextResponse.json({ code: 'FORBIDDEN_TOPIC', message: `No access to topic ${topicId}` }, { status: 403 });
  }

  try {
    const result = await rollbackLessonVersion({ topicId, versionNumber, reviewerId: admin.accountId ?? null });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ContentReviewError) {
      const status = error.code === 'VERSION_NOT_FOUND' ? 404 : 409;
      return NextResponse.json({ code: error.code, message: error.message }, { status });
    }
    return NextResponse.json({ code: 'ROLLBACK_FAILED', message: error instanceof Error ? error.message : 'Rollback failed' }, { status: 400 });
  }
}
