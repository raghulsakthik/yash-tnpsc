import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { listPendingBatches } from '../../../../../lib/contentReview.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/content/review -- every batch awaiting a human decision. */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const batches = await listPendingBatches();
  return NextResponse.json({ batches });
}
