import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { emailConfigured } from '../../../../lib/email.mjs';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** GET /api/notify/email -- the currently configured address, if any. */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const { rows } = await query(`SELECT notify_email FROM learner_profile WHERE learner_id = $1`, [learnerId]);
    return NextResponse.json({ email: rows[0]?.notify_email ?? null, configured: emailConfigured });
  } catch (err) {
    return NextResponse.json({ code: 'EMAIL_LOOKUP_FAILED', message: err.message }, { status: 500 });
  }
}

/** POST /api/notify/email  body: { email: string } -- sets the recipient address. */
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

  const email = body.email?.trim();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ code: 'INVALID_EMAIL', message: 'A valid email address is required' }, { status: 400 });
  }

  try {
    await query(`UPDATE learner_profile SET notify_email = $1, updated_at = now() WHERE learner_id = $2`, [email, learnerId]);
    return NextResponse.json({ email });
  } catch (err) {
    return NextResponse.json({ code: 'EMAIL_SAVE_FAILED', message: err.message }, { status: 500 });
  }
}
