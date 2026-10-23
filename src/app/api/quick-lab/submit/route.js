import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { recordEvent } from '../../../../lib/db.mjs';
import { resolvePendingQuestion } from '../../../../lib/quicklabTokens.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quick-lab/submit
 * body: { token, selectedIndex, mode, timeTakenMs }
 *
 * Grades one Quick Lab answer against its server-held token. Logged as an
 * analytics event only -- Quick Lab is a speed drill, not graded exam
 * content, so it doesn't feed topic mastery or the revision schedule.
 */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const { token, selectedIndex, mode, timeTakenMs } = body;
  if (!token || typeof selectedIndex !== 'number') {
    return NextResponse.json({ code: 'MISSING_FIELDS', message: 'token and selectedIndex are required' }, { status: 400 });
  }

  const pending = resolvePendingQuestion(token, { learnerId, mode });
  if (pending === null) {
    return NextResponse.json({ code: 'TOKEN_EXPIRED', message: 'This question has expired' }, { status: 410 });
  }

  const correct = selectedIndex === pending.correctIndex;
  await recordEvent(learnerId, 'QUICKLAB_ANSWERED', null, { mode, correct, timeTakenMs });

  return NextResponse.json({ correct, correctIndex: pending.correctIndex });
}
