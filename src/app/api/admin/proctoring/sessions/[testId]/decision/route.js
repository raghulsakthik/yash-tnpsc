import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../../lib/auth.mjs';
import { recordDecision, ProctoringError } from '../../../../../../../lib/proctoring.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/proctoring/sessions/:testId/decision
 * body: { decision: 'CLEAR'|'WARNING'|'FLAG'|'INVALIDATE'|'REVIEW_REQUIRED', reason? }
 *
 * Records the admin's integrity verdict on this attempt. Storage only --
 * does not change the learner's real score or test status; see
 * recordDecision's own comment in proctoring.mjs for why.
 */
export async function POST(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { testId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  try {
    await recordDecision(testId, { decision: body.decision, reason: body.reason, decidedBy: admin.accountId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProctoringError) {
      const status = err.code === 'SESSION_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ code: err.code, message: err.message }, { status });
    }
    return NextResponse.json({ code: 'DECISION_FAILED', message: err.message }, { status: 500 });
  }
}
