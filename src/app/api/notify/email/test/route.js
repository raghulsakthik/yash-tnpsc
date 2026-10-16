import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../../lib/db.mjs';
import { sendEmailToLearner, emailConfigured } from '../../../../../lib/email.mjs';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!emailConfigured) {
    return NextResponse.json({ code: 'EMAIL_NOT_CONFIGURED', message: 'SMTP is not set up on the server' }, { status: 503 });
  }

  try {
    const result = await sendEmailToLearner(LEARNER_ID, {
      subject: 'Notifications are on',
      text: "You'll hear from here by email when something needs you.",
    });
    return NextResponse.json({ sent: true, to: result.to });
  } catch (err) {
    const code = err.message.includes('No notification email') ? 'NO_EMAIL_SET' : 'EMAIL_SEND_FAILED';
    return NextResponse.json({ code, message: err.message }, { status: 400 });
  }
}
