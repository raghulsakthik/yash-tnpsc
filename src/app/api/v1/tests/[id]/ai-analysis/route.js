import { NextResponse } from 'next/server';
import { analyzeTest, getStoredTestAnalysis } from '../../../../../../services/aiInsightsService.mjs';
import { NotFoundError, ValidationError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/tests/:id/ai-analysis
 *
 * Phase 30.4: generates (or returns the real, already-stored) AI
 * interpretation of a completed test's real diagnostic — stored in
 * assessment.metadata.aiAnalysis, the brief's own "backend stores" ask.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const result = await analyzeTest(id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'AI_TEST_ANALYSIS_FAILED', message: err.message }, { status: 500 });
  }
}

/** GET /api/v1/tests/:id/ai-analysis — the real, already-stored AI analysis, or null if POST hasn't run yet. */
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const analysis = await getStoredTestAnalysis(id);
    return NextResponse.json({ testId: id, analysis });
  } catch (err) {
    return NextResponse.json({ code: 'AI_TEST_ANALYSIS_FETCH_FAILED', message: err.message }, { status: 500 });
  }
}
