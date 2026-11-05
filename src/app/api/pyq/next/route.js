import { NextResponse } from 'next/server';
import { recordEvent } from '../../../../lib/db.mjs';
import { requireLearner } from '../../../../lib/auth.mjs';
import { getNextPyqQuestion } from '../../../../services/pyqService.mjs';
import { NotFoundError } from '../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pyq/next?topic=aptitude.lcm
 *
 * The same question-selection logic as GET /api/questions/next (unchanged),
 * restricted to real past-paper-tagged questions. Answers are submitted
 * through the existing POST /api/attempts — a PYQ attempt is not a
 * different kind of attempt, just evidence that happens to come from a
 * real paper.
 */
export async function GET(request) {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  const topicId = new URL(request.url).searchParams.get('topic') ?? 'aptitude.fractions';
  try {
    const question = await getNextPyqQuestion(learner.id, topicId);
    await recordEvent(learner.id, 'PYQ_QUESTION_VIEWED', topicId, { questionId: question.questionId });
    return NextResponse.json(question);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'NO_PYQ_QUESTIONS', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'PYQ_NEXT_FAILED', message: err.message }, { status: 500 });
  }
}
