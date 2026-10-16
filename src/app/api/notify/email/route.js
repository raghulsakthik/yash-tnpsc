import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';
import { emailConfigured } from '../../../../lib/email.mjs';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** GET /api/notify/email -- the currently configured address, if any. */
export async function GET() {
  try {
    const { rows } = await query(`SELECT notify_email FROM learner_profile WHERE learner_id = $1`, [LEARNER_ID]);
    return NextResponse.json({ email: rows[0]?.notify_email ?? null, configured: emailConfigured });
  } catch (err) {
    return NextResponse.json({ code: 'EMAIL_LOOKUP_FAILED', message: err.message }, { status: 500 });
  }
}

/** POST /api/notify/email  body: { email: string } -- sets the recipient address. */
export async function POST(request) {
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
    await query(`UPDATE learner_profile SET notify_email = $1, updated_at = now() WHERE learner_id = $2`, [email, LEARNER_ID]);
    return NextResponse.json({ email });
  } catch (err) {
    return NextResponse.json({ code: 'EMAIL_SAVE_FAILED', message: err.message }, { status: 500 });
  }
}
