import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { getPyqPerformanceSummary } from '../../../../services/pyqService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pyq/performance
 *
 * "PYQs become another evidence source": how real past-paper performance
 * compares to authored-question performance, overall and per topic — read
 * from question_attempt exactly as it already exists, no separate scoring
 * system.
 */
export async function GET() {
  try {
    const summary = await getPyqPerformanceSummary(LEARNER_ID);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ code: 'PYQ_PERFORMANCE_FAILED', message: err.message }, { status: 500 });
  }
}
