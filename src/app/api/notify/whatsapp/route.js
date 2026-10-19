import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { whatsappConfigured } from '../../../../lib/whatsapp.mjs';

export const dynamic = 'force-dynamic';

// E.164: a leading + followed by 8-15 digits, no spaces or punctuation.
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

/** GET /api/notify/whatsapp -- the currently configured number, if any. */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const { rows } = await query(`SELECT notify_whatsapp FROM learner_profile WHERE learner_id = $1`, [learnerId]);
    return NextResponse.json({ number: rows[0]?.notify_whatsapp ?? null, configured: whatsappConfigured });
  } catch (err) {
    return NextResponse.json({ code: 'WHATSAPP_LOOKUP_FAILED', message: err.message }, { status: 500 });
  }
}

/** POST /api/notify/whatsapp  body: { number: string } -- sets the recipient number (E.164, e.g. +919876543210). */
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

  const number = body.number?.trim();
  if (!number || !PHONE_RE.test(number)) {
    return NextResponse.json(
      { code: 'INVALID_NUMBER', message: 'A valid number in E.164 format is required, e.g. +919876543210' },
      { status: 400 }
    );
  }

  try {
    await query(`UPDATE learner_profile SET notify_whatsapp = $1, updated_at = now() WHERE learner_id = $2`, [number, learnerId]);
    return NextResponse.json({ number });
  } catch (err) {
    return NextResponse.json({ code: 'WHATSAPP_SAVE_FAILED', message: err.message }, { status: 500 });
  }
}
