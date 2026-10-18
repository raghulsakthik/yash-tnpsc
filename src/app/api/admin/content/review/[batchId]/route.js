import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/auth.mjs';
import { approveBatch, rejectBatch, ContentReviewError } from '../../../../../../lib/contentReview.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/review/[batchId]
 * body: { decision: 'approve' | 'reject' }
 */
export async function POST(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const { batchId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  if (body.decision !== 'approve' && body.decision !== 'reject') {
    return NextResponse.json({ code: 'INVALID_DECISION', message: 'decision must be "approve" or "reject"' }, { status: 400 });
  }

  try {
    const result = body.decision === 'approve' ? await approveBatch(batchId) : await rejectBatch(batchId);
    return NextResponse.json({ decision: body.decision, ...result });
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'REVIEW_FAILED', message: err.message }, { status: 500 });
  }
}
