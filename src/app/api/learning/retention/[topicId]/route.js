import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
import { getEffectiveRetention } from '../../../../../services/retentionEngineService.mjs';
import { NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/retention/:topicId
 *
 * The "basic" Retention Engine the brief asks for: successful recall,
 * difficulty, and confidence are already folded into the stored
 * retention_score by the unchanged spaced-repetition pipeline; this adds
 * time-since-recall decay and a mistake-pattern discount, read-time only —
 * not a replacement for the stored value, a sharper read of it.
 */
export async function GET(request, { params }) {
  const { topicId } = await params;
  try {
    const result = await getEffectiveRetention(LEARNER_ID, topicId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TOPIC_STATE_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'RETENTION_ESTIMATE_FAILED', message: err.message }, { status: 500 });
  }
}
