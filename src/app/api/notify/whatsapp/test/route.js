import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../../lib/auth.mjs';
import { sendWhatsAppToLearner, whatsappConfigured } from '../../../../../lib/whatsapp.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!whatsappConfigured) {
    return NextResponse.json({ code: 'WHATSAPP_NOT_CONFIGURED', message: 'WhatsApp is not set up on the server' }, { status: 503 });
  }

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const result = await sendWhatsAppToLearner(
      learnerId,
      '⏰ Reminder: Notifications are on.\nYou\'ll get a nudge here when your streak is at risk, you\'ve gone quiet for a couple of days, or a weekly test is waiting -- never a blind timer, only when it actually applies to you.'
    );
    return NextResponse.json({ sent: true, to: result.to });
  } catch (err) {
    const code = err.message.includes('No WhatsApp number') ? 'NO_NUMBER_SET' : 'WHATSAPP_SEND_FAILED';
    return NextResponse.json({ code, message: err.message }, { status: 400 });
  }
}
