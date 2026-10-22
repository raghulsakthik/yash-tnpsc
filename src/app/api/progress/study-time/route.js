import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { recordEvent } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/** POST /api/progress/study-time -- explicit learner-reported study time. */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'BAD_JSON' }, { status: 400 }); }
  const minutes = Number(body?.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) return NextResponse.json({ code: 'INVALID_MINUTES', message: 'Minutes must be between 1 and 240' }, { status: 400 });
  await recordEvent(learnerId, 'STUDY_MINUTES_LOGGED', null, { minutes: Math.round(minutes) });
  return NextResponse.json({ saved: true, minutes: Math.round(minutes) });
}
