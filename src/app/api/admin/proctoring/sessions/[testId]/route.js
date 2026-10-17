import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/auth.mjs';
import { getSessionDetail } from '../../../../../../lib/proctoring.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { testId } = await params;
  try {
    const detail = await getSessionDetail(testId);
    if (!detail) return NextResponse.json({ code: 'SESSION_NOT_FOUND', message: `No proctoring session for test ${testId}` }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ code: 'GET_FAILED', message: err.message }, { status: 500 });
  }
}
