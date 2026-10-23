import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';
import { requireUser } from '../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/resources -- real, admin-uploaded downloadable resources only. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });

  const { rows } = await query(
    `SELECT id, title, description, category, content_type, size_bytes, created_at
       FROM resource_file ORDER BY created_at DESC`
  );
  return NextResponse.json({
    resources: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      contentType: r.content_type,
      sizeBytes: r.size_bytes,
      createdAt: r.created_at,
    })),
  });
}
