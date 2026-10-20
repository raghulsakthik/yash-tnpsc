import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../lib/permissions.mjs';
import { listPendingReports } from '../../../../../lib/contentReports.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/content/support -- the Question Support Center's queue. */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.SUPPORT_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const reports = await listPendingReports();
  return NextResponse.json({ reports });
}
