import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { startSession, ProctoringError } from '../../../../lib/proctoring.mjs';

export const dynamic = 'force-dynamic';

/** POST /api/proctoring/start -- body: { testId }. Learner has just consented to recording for this test. */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });

  try {
    const { testId } = await request.json();
    if (!testId) return NextResponse.json({ code: 'MISSING_TEST_ID', message: 'testId is required' }, { status: 400 });
    const sessionId = await startSession(testId, learnerId);
    return NextResponse.json({ sessionId });
  } catch (err) {
    if (err instanceof ProctoringError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'START_FAILED', message: err.message }, { status: 500 });
  }
}
