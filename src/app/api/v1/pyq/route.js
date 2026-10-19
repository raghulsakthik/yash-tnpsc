import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { listPyqQuestions } from '../../../../services/pyqCatalogService.mjs';
import { ValidationError } from '../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/pyq?year=&subjectId=&topicId=&mode=&limit=
 *
 * Phase 26.3: year-wise/subject-wise/topic-wise/mixed/weak-area/incorrect/
 * timed PYQ practice, all as one filtered list over the real transcribed
 * past-paper catalogue (source LIKE 'tnpsc-%'). timeLimitSeconds is the
 * real sum of this list's estimated_seconds — the "timed" mode's budget.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;
  const subjectId = searchParams.get('subjectId') ?? undefined;
  const topicId = searchParams.get('topicId') ?? undefined;
  const mode = searchParams.get('mode') ?? undefined;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;

  try {
    const result = await listPyqQuestions(LEARNER_ID, { year, subjectId, topicId, mode, limit });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'PYQ_LIST_FAILED', message: err.message }, { status: 500 });
  }
}
