import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireAdmin } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/notifications -- real broadcast history (Admin Portal's Notifications section), newest first. */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const { rows } = await query(
    `SELECT id, title, message, target_audience, recipient_count, created_at FROM admin_broadcast ORDER BY created_at DESC LIMIT 50`
  );

  return NextResponse.json({
    broadcasts: rows.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      targetAudience: r.target_audience,
      recipientCount: r.recipient_count,
      createdAt: r.created_at,
    })),
  });
}
