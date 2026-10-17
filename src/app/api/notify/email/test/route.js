import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../../lib/auth.mjs';
import { sendEmailToLearner, emailConfigured } from '../../../../../lib/email.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!emailConfigured) {
    return NextResponse.json({ code: 'EMAIL_NOT_CONFIGURED', message: 'SMTP is not set up on the server' }, { status: 503 });
  }

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const result = await sendEmailToLearner(learnerId, {
      subject: 'Notifications are on',
      text: "You'll hear from here by email when something needs you.",
    });
    return NextResponse.json({ sent: true, to: result.to });
  } catch (err) {
    const code = err.message.includes('No notification email') ? 'NO_EMAIL_SET' : 'EMAIL_SEND_FAILED';
    return NextResponse.json({ code, message: err.message }, { status: 400 });
  }
}
