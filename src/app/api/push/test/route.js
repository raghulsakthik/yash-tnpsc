import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../../lib/db.mjs';
import { sendPushToLearner, pushConfigured } from '../../../../lib/push.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push/test
 *
 * Sends one real notification to every device she's subscribed on, so the
 * "Enable notifications" flow has something to confirm with immediately
 * rather than trusting that it'll work days later when revision comes due.
 */
export async function POST() {
  if (!pushConfigured) {
    return NextResponse.json(
      { code: 'PUSH_NOT_CONFIGURED', message: 'VAPID keys are not set on the server' },
      { status: 503 }
    );
  }

  try {
    const result = await sendPushToLearner(LEARNER_ID, {
      title: 'Notifications are on',
      body: "You'll hear from here when something needs you.",
      tag: 'test',
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'PUSH_FAILED', message: err.message }, { status: 500 });
  }
}
