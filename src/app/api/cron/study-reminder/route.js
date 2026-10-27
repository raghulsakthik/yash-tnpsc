import { NextResponse } from 'next/server';
import { env } from '../../../../lib/env.mjs';
import { sendTextbeeSms, textbeeConfigured } from '../../../../lib/textbee.mjs';

export const dynamic = 'force-dynamic';

const MESSAGE = "Hey Yashika! Dont forget to study today - your future depends on this, and we believe in you. Put the reels down and open your TNPSC books. Stop overthinking, just start. Youve got this!";

/**
 * GET /api/cron/study-reminder -- daily real SMS via TextBee (a real
 * Android phone's SIM, not an email-to-carrier-gateway trick, so it
 * actually works for Indian numbers). Scheduled 11:00 AM IST via
 * vercel.json's crons (05:30 UTC). Recipient is STUDY_REMINDER_PHONE, not
 * hardcoded, so this isn't tied to one person's number in source control.
 */
export async function GET(request) {
  const secret = env.cronSecret;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Valid cron secret required' }, { status: 401 });
  }

  const recipient = process.env.STUDY_REMINDER_PHONE;
  if (!textbeeConfigured || !recipient) {
    return NextResponse.json({ code: 'NOT_CONFIGURED', message: 'TextBee or STUDY_REMINDER_PHONE is not configured' }, { status: 200 });
  }

  try {
    const result = await sendTextbeeSms([recipient], MESSAGE);
    return NextResponse.json({ at: new Date().toISOString(), sent: true, result });
  } catch (err) {
    return NextResponse.json({ code: 'STUDY_REMINDER_FAILED', message: err.message }, { status: 500 });
  }
}
