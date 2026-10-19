import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { logEvent, ProctoringError } from '../../../../lib/proctoring.mjs';

export const dynamic = 'force-dynamic';

const VALID_EVENT_TYPES = new Set([
  'TAB_HIDDEN',
  'TAB_VISIBLE',
  'FULLSCREEN_EXIT',
  'FULLSCREEN_ENTER',
  'CAMERA_LOST',
  'SCREEN_SHARE_LOST',
  'CONSENT_DENIED',
]);

/** POST /api/proctoring/event -- body: { testId, eventType, metadata? }. Tab switches, fullscreen exits, lost streams. */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });

  try {
    const { testId, eventType, metadata } = await request.json();
    if (!testId || !eventType) return NextResponse.json({ code: 'MISSING_FIELDS', message: 'testId and eventType are required' }, { status: 400 });
    if (!VALID_EVENT_TYPES.has(eventType)) return NextResponse.json({ code: 'INVALID_EVENT_TYPE', message: `Unknown eventType "${eventType}"` }, { status: 400 });
    await logEvent(testId, learnerId, eventType, metadata);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProctoringError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'EVENT_FAILED', message: err.message }, { status: 500 });
  }
}
