import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../../../lib/permissions.mjs';
import { query } from '../../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/content/lineage/:contentId -- immutable provenance for a question or resource. */
export async function GET(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Content read permission required' }, { status: 403 });
  const { contentId } = await params;
  const { rows } = await query(`
    SELECT l.*, b.status AS review_status, b.reviewed_at, b.reviewed_by,
           u.email AS reviewer_email
      FROM content_lineage l
      LEFT JOIN content_review_batch b ON b.id = l.review_batch_id
      LEFT JOIN app_user u ON u.id = b.reviewed_by
     WHERE l.question_id = $1 OR l.resource_id::text = $1
     ORDER BY l.created_at DESC
     LIMIT 1`, [contentId]);
  if (!rows.length) return NextResponse.json({ code: 'NOT_FOUND', message: 'No lineage record found.' }, { status: 404 });
  const lineage = rows[0];
  if (!(await canActOnTopic(admin, PERMISSIONS.CONTENT_READ, lineage.topic_id))) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this content' }, { status: 403 });
  }
  return NextResponse.json({ lineage });
}
