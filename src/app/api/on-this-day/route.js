import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../lib/auth.mjs';
import { onThisDay } from '../../../lib/onThisDay.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/on-this-day -- real historical GK facts for today's date, via Wikipedia's open API. */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const events = await onThisDay();
  if (!events) {
    return NextResponse.json({ code: 'UNAVAILABLE', message: 'Could not reach Wikipedia right now' }, { status: 503 });
  }

  return NextResponse.json({ events });
}
