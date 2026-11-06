import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { listRecentEvents } from '../../../../../lib/proctoring.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/proctoring/events?limit=100 -- the real incident events feed. */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    const limit = new URL(request.url).searchParams.get('limit');
    return NextResponse.json({ events: await listRecentEvents(limit) });
  } catch (err) {
    return NextResponse.json({ code: 'LIST_FAILED', message: err.message }, { status: 500 });
  }
}
