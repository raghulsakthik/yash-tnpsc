import { NextResponse } from 'next/server';
import { checkStreakAtRisk, checkInactivity, checkTestReminder, checkMotivation } from '../../../../lib/activityNotifications.mjs';
import { pushConfigured } from '../../../../lib/push.mjs';
import { fcmConfigured } from '../../../../lib/fcm.mjs';
import { whatsappConfigured } from '../../../../lib/whatsapp.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/activity -- the HTTP equivalent of
 * scripts/activity-notifications-scheduler.mjs's hourly tick(), for the
 * same reason /api/cron/engagement exists: a serverless host has nothing
 * that stays running for setInterval to fire inside. Every check function
 * here is already idempotent per its own time window (see
 * alreadySentToday/alreadySentWithin in activityNotifications.mjs), so
 * calling this more or less often than exactly hourly is still safe --
 * it just changes how promptly a real event is noticed, never duplicates
 * a send.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Missing or invalid cron secret' }, { status: 401 });
    }
  }

  if (!pushConfigured && !fcmConfigured && !whatsappConfigured) {
    return NextResponse.json({ code: 'NO_CHANNEL_CONFIGURED', message: 'No notification channel configured' }, { status: 200 });
  }

  try {
    const [streak, inactivity, testReminder, motivation] = await Promise.all([
      checkStreakAtRisk(),
      checkInactivity(),
      checkTestReminder(),
      checkMotivation(),
    ]);
    return NextResponse.json({
      at: new Date().toISOString(),
      streakRiskSent: streak.sent,
      inactivitySent: inactivity.sent,
      testReminderSent: testReminder.sent,
      motivationSent: motivation.sent,
    });
  } catch (err) {
    return NextResponse.json({ code: 'CHECK_FAILED', message: err.message }, { status: 500 });
  }
}
