import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { hasPermission, PERMISSIONS, canActOnTopic } from '../../../../../lib/permissions.mjs';
import { query } from '../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/content-engine/versions?topicId=... */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  if (!hasPermission(admin, PERMISSIONS.REVIEW_CONTENT) && !hasPermission(admin, PERMISSIONS.REVIEW_QUESTION)) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Content review permission required' }, { status: 403 });
  }

  const topicId = new URL(request.url).searchParams.get('topicId')?.trim();
  if (!topicId) return NextResponse.json({ code: 'INVALID_TOPIC', message: 'topicId is required' }, { status: 400 });
  const allowed = await canActOnTopic(admin, PERMISSIONS.REVIEW_CONTENT, topicId) || await canActOnTopic(admin, PERMISSIONS.REVIEW_QUESTION, topicId);
  if (!allowed) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });

  const { rows } = await query(`
    SELECT v.id,v.topic_id,v.publication_id,v.content_id,v.version_number,v.title,v.concept,v.definition,
           v.explanation,v.examples,v.revision_notes,v.source_ids,v.engine_version,v.review_batch_id,
           v.status,v.created_at,v.published_at,v.superseded_at,v.rolled_back_at,v.reviewed_by
      FROM content_engine_lesson_version v
     WHERE v.topic_id=$1
     ORDER BY v.version_number DESC`, [topicId]);
  return NextResponse.json({ topicId, versions: rows });
}
