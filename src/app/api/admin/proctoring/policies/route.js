import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { listPolicies } from '../../../../../lib/proctoring.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/proctoring/policies -- the real security policies (see db/migrations/V79__proctoring_hub.sql). */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    return NextResponse.json({ policies: await listPolicies() });
  } catch (err) {
    return NextResponse.json({ code: 'LIST_FAILED', message: err.message }, { status: 500 });
  }
}
