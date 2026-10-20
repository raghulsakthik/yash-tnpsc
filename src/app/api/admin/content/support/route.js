import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { listPendingReports } from '../../../../../lib/contentReports.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/content/support -- the Question Support Center's queue. */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const reports = await listPendingReports();
  return NextResponse.json({ reports });
}
