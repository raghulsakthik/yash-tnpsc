#!/usr/bin/env node
// Two kinds of notification, one scheduler:
//  - activity-based (Zomato/Swiggy pattern): streak about to break, gone
//    quiet, a test sitting idle -- only fires when that's actually true.
//  - motivation (6am-11pm, roughly every 2 hours): a steady drumbeat of
//    pep talks, not conditional on anything -- see MOTIVATION_SLOTS in
//    src/domain/motivation.mjs.
// Every check function is idempotent for its own window (see
// alreadySentToday / alreadySentWithin in src/lib/activityNotifications.mjs),
// so running this hourly is safe even across restarts.

import { checkStreakAtRisk, checkInactivity, checkTestReminder, checkMotivation } from '../src/lib/activityNotifications.mjs';
import { pushConfigured } from '../src/lib/push.mjs';
import { fcmConfigured } from '../src/lib/fcm.mjs';
import { whatsappConfigured } from '../src/lib/whatsapp.mjs';

const HOUR_MS = 60 * 60 * 1000;

if (!pushConfigured && !fcmConfigured && !whatsappConfigured) {
  console.error('[activity] No notification channel is configured (Web Push, FCM, WhatsApp) -- nothing to send through. Exiting.');
  process.exit(1);
}

async function tick() {
  try {
    const [streak, inactivity, testReminder, motivation] = await Promise.all([
      checkStreakAtRisk(),
      checkInactivity(),
      checkTestReminder(),
      checkMotivation(),
    ]);
    console.log(
      `[activity] ${new Date().toISOString()} streak-risk sent:${streak.sent} inactivity sent:${inactivity.sent} ` +
        `test-reminder sent:${testReminder.sent} motivation sent:${motivation.sent}`
    );
  } catch (err) {
    console.error('[activity] Check failed:', err.message);
  }
}

console.log('[activity] Scheduler started -- checking every hour, starting now.');
tick();
setInterval(tick, HOUR_MS);
