import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/auth.mjs';
import { getSessionDetail, deleteSession, ProctoringError } from '../../../../../../lib/proctoring.mjs';

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

/** DELETE /api/admin/proctoring/sessions/:testId -- permanently removes both recordings and the session's event log. */
export async function DELETE(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { testId } = await params;
  try {
    await deleteSession(testId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProctoringError) return NextResponse.json({ code: err.code, message: err.message }, { status: 404 });
    return NextResponse.json({ code: 'DELETE_FAILED', message: err.message }, { status: 500 });
  }
}
