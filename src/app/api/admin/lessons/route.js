import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth.mjs';
import { listLessonsByTopic } from '../../../../lib/adminCrud.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/lessons -- every topic, with whether it already has a lesson. */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    return NextResponse.json({ topics: await listLessonsByTopic() });
  } catch (err) {
    return NextResponse.json({ code: 'LIST_FAILED', message: err.message }, { status: 500 });
  }
}
