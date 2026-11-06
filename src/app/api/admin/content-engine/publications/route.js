import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../../lib/permissions.mjs';
import { query } from '../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/content-engine/publications?limit=50 */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.AI_GENERATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'AI generation permission required' }, { status: 403 });

  const requested = Number(new URL(request.url).searchParams.get('limit') || 50);
  const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 200) : 50;

  const { rows } = await query(`
    SELECT
      p.publication_id,
      p.manifest_hash,
      p.item_count,
      p.status,
      p.created_by,
      p.created_at,
      COUNT(l.id)::int AS lineage_items,
      COUNT(*) FILTER (WHERE l.status='IMPORTED')::int AS imported_items,
      COUNT(*) FILTER (WHERE l.status='PUBLISHED')::int AS published_items,
      COUNT(*) FILTER (WHERE l.status='REJECTED')::int AS rejected_items,
      COUNT(DISTINCT l.topic_id)::int AS topic_count,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT l.topic_id), NULL) AS topic_ids
    FROM content_engine_publication p
    LEFT JOIN content_engine_lineage l ON l.publication_id=p.publication_id
    GROUP BY p.publication_id
    ORDER BY p.created_at DESC
    LIMIT $1`, [limit]);

  const publications = [];
  for (const publication of rows) {
    const topicIds = Array.isArray(publication.topic_ids) ? publication.topic_ids : [];
    const allowed = await Promise.all(topicIds.map((topicId) => canActOnTopic(admin, PERMISSIONS.AI_GENERATE, topicId)));
    if (topicIds.length && allowed.every(Boolean)) publications.push(publication);
  }
  return NextResponse.json({ publications });
}
