import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { compareLatestAssessments } from '../../../../services/testComparisonService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/test-comparison
 *
 * Test-to-Test Intelligence: compares the two most recent completed
 * assessments across every topic they both covered — accuracy, speed,
 * confidence, mistake patterns, difficulty — and decides, per topic,
 * whether whatever's been happening since should continue, change, stop,
 * or escalate.
 */
export async function GET() {
  try {
    const comparison = await compareLatestAssessments(LEARNER_ID);
    return NextResponse.json(comparison);
  } catch (err) {
    return NextResponse.json({ code: 'TEST_COMPARISON_FAILED', message: err.message }, { status: 500 });
  }
}
