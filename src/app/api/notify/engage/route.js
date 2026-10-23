import { env } from '../../../../lib/env.mjs';
import { NextResponse } from 'next/server';
import { sendEngagementEmail } from '../../../../lib/engagement.mjs';
import { emailConfigured } from '../../../../lib/email.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notify/engage
 *
 * Sends one real engagement email immediately, built from today's actual
 * plan. The same content the 3-hourly schedule (src/instrumentation.js)
 * sends -- this just lets it be triggered on demand instead of waited for.
 */
export async function POST(request) {
  const secret = env.cronSecret;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Valid cron secret required' }, { status: 401 });
  }
  if (!emailConfigured) {
    return NextResponse.json({ code: 'EMAIL_NOT_CONFIGURED', message: 'SMTP is not set up on the server' }, { status: 503 });
  }

  try {
    const result = await sendEngagementEmail();
    return NextResponse.json({ sent: true, to: result.to });
  } catch (err) {
    const code = err.message.includes('No notification email') ? 'NO_EMAIL_SET' : 'ENGAGE_SEND_FAILED';
    return NextResponse.json({ code, message: err.message }, { status: 400 });
  }
}
