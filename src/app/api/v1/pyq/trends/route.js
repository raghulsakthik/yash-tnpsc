import { NextResponse } from 'next/server';
import { getPyqTrends } from '../../../../../services/pyqIntelligenceService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/pyq/trends
 *
 * Phase 26.2's historical intelligence: real topic/subject frequency,
 * year-wise trends and difficulty distribution over the transcribed
 * past-paper catalogue — every report carries the brief's own explicit
 * disclaimer that frequency is not a prediction.
 */
export async function GET() {
  try {
    const trends = await getPyqTrends();
    return NextResponse.json(trends);
  } catch (err) {
    return NextResponse.json({ code: 'PYQ_TRENDS_FAILED', message: err.message }, { status: 500 });
  }
}
