import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../../lib/auth.mjs';
import { reportQuestion, isValidReason, ReportError } from '../../../../../lib/contentReports.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/questions/:id/report
 * body: { reason: string, description?: string }
 *
 * Every MCQ needs a way for a learner to flag it -- wrong answer, unclear
 * wording, whatever. Lands in content_report, surfaced to admins in the
 * Support Center (/admin/support). Never auto-corrects anything; a human
 * reviews and resolves it.
 */
export async function POST(request, { params }) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  if (!isValidReason(body.reason)) {
    return NextResponse.json({ code: 'INVALID_REASON', message: 'Not a recognized report reason' }, { status: 400 });
  }

  try {
    await reportQuestion({ learnerId, questionId: id, reason: body.reason, description: body.description });
    return NextResponse.json({ reported: true });
  } catch (err) {
    if (err instanceof ReportError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'REPORT_FAILED', message: err.message }, { status: 500 });
  }
}
