import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
import { getCompletionVerdict } from '../../../../../services/completionCriteriaService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/completion-status/:topicId
 *
 * Phase 25's "Completion Criteria": CONTINUE / STRENGTHEN / REVISE /
 * REASSESS / MASTERED / RETAINED, composed from Phase 13's mastery gate,
 * Phase 6's prerequisite risk, Phase 11's revision-due check and Phase 24's
 * effective retention — nothing recomputed here.
 */
export async function GET(request, { params }) {
  const { topicId } = await params;
  try {
    const result = await getCompletionVerdict(LEARNER_ID, topicId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'COMPLETION_STATUS_FAILED', message: err.message }, { status: 500 });
  }
}
