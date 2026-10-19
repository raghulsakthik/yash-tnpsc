import { NextResponse } from 'next/server';
import { sendEngagementEmail } from '../../../../lib/engagement.mjs';
import { emailConfigured } from '../../../../lib/email.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/engagement -- the same tick() scripts/engagement-scheduler.mjs
 * ran on a setInterval, now as an HTTP endpoint a scheduler (Vercel Cron, or
 * any external pinger like cron-job.org) can call instead. A long-running
 * Node process can't exist on a serverless host -- there's no "the server
 * stays on" to run setInterval in -- so the loop has to move outside the
 * app entirely and call in on a schedule.
 *
 * Protected by CRON_SECRET so this isn't a free "spam myself an email"
 * endpoint for anyone who finds the URL. Vercel Cron sends this header
 * automatically when CRON_SECRET is set in the project's env vars; an
 * external pinger needs it added to its request headers by hand.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Missing or invalid cron secret' }, { status: 401 });
    }
  }

  if (!emailConfigured) {
    return NextResponse.json({ code: 'EMAIL_NOT_CONFIGURED', message: 'SMTP is not configured' }, { status: 200 });
  }

  try {
    const result = await sendEngagementEmail();
    return NextResponse.json({ sent: true, to: result.to, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ sent: false, error: err.message }, { status: 500 });
  }
}
