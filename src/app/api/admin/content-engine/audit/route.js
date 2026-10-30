import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../../lib/permissions.mjs';
import { query } from '../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/content-engine/audit?topicId=...&limit=100 */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Content permission required' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const topicId = params.get('topicId')?.trim() || '';
  if (topicId && !(await canActOnTopic(admin, PERMISSIONS.CONTENT_CREATE, topicId))) {
    return NextResponse.json({ code: 'FORBIDDEN_TOPIC', message: `No access to topic ${topicId}` }, { status: 403 });
  }
  const requested = Number(params.get('limit') || 100);
  const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 500) : 100;
  const { rows } = await query(`
    SELECT id,publication_id,topic_id,content_id,content_kind,version_number,action,actor_id,metadata,created_at
      FROM content_engine_audit
     WHERE ($1='' OR topic_id=$1)
     ORDER BY created_at DESC,id DESC
     LIMIT $2`, [topicId, limit]);
  return NextResponse.json({ topicId: topicId || null, events: rows });
}
