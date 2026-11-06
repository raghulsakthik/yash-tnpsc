import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/auth.mjs';
import { updatePolicy, ProctoringError } from '../../../../../../lib/proctoring.mjs';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/proctoring/policies/:id
 * body: any subset of the real boolean toggle fields (see POLICY_COLUMNS
 * in proctoring.mjs) -- the Admin Portal's policy editor only exposes
 * toggles, so that's all this accepts.
 */
export async function PATCH(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  try {
    await updatePolicy(id, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProctoringError) {
      const status = err.code === 'POLICY_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ code: err.code, message: err.message }, { status });
    }
    return NextResponse.json({ code: 'UPDATE_FAILED', message: err.message }, { status: 500 });
  }
}
