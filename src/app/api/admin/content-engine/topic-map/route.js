import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../lib/permissions.mjs';
import { query } from '../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/content-engine/topic-map
 *
 * Exposes the platform-owned curriculum/topic identifiers to the content engine.
 * The engine must consume these identifiers rather than inventing platform topic IDs.
 */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) {
    return NextResponse.json(
      { code: 'FORBIDDEN', message: 'Content permission required' },
      { status: 403 },
    );
  }

  const { rows } = await query(`
    SELECT
      t.id AS topic_id,
      t.name AS topic_name,
      t.sort_order AS topic_sort_order,
      c.id AS chapter_id,
      c.name AS chapter_name,
      c.sort_order AS chapter_sort_order,
      s.id AS subject_id,
      s.name AS subject_name,
      s.sort_order AS subject_sort_order
    FROM topic t
    JOIN chapter c ON c.id = t.chapter_id
    JOIN subject s ON s.id = c.subject_id
    ORDER BY s.sort_order, c.sort_order, t.sort_order, t.id
  `);

  return NextResponse.json({
    contractVersion: 1,
    exam: 'tnpsc-prelims-495',
    topics: rows,
  });
}
