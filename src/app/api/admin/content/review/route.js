import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { hasPermission, PERMISSIONS } from '../../../../../lib/permissions.mjs';
import { listPendingBatches } from '../../../../../lib/contentReview.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/content/review -- pending batches the authenticated reviewer is authorised to inspect. */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const canReviewQuestions = hasPermission(admin, PERMISSIONS.REVIEW_QUESTION);
  const canReviewContent = hasPermission(admin, PERMISSIONS.REVIEW_CONTENT);
  if (!canReviewQuestions && !canReviewContent) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Your admin role cannot review content.' }, { status: 403 });
  }
  const batches = await listPendingBatches({ admin, canReviewQuestions, canReviewContent });
  return NextResponse.json({ batches });
}
