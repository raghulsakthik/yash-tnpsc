import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
import { getAiTutorResponse } from '../../../../../services/aiTutorService.mjs';
import { NotFoundError, ValidationError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/ai/tutor
 * body: { task, topicId?, questionId?, secondTopicId?, selectedIndex? }
 *
 * Phase 29.4/29.5: the single dispatch point for all ten AI Tutor
 * capabilities (AITaskType, enums.mjs) — Context Builder -> Prompt
 * Template -> AI Model -> Validation -> Structured Response -> Logger,
 * exactly the brief's own pipeline. Falls back to a real, grounded,
 * deterministic response when no AI provider is reachable (the default
 * state in this environment) — never a raw error for that reason alone.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }
  const { task, topicId, questionId, secondTopicId, selectedIndex } = body;
  if (!task) return NextResponse.json({ code: 'MISSING_FIELDS', message: 'task is required' }, { status: 400 });

  try {
    const result = await getAiTutorResponse(LEARNER_ID, task, { topicId, questionId, secondTopicId, selectedIndex });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'AI_TUTOR_NOT_FOUND', message: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'AI_TUTOR_FAILED', message: err.message }, { status: 500 });
  }
}
