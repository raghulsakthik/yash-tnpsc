import { query, recordEvent } from './db.mjs';
import { computeStreak } from '../domain/progress.mjs';
import { dateKeyInAppTimezone, hourInAppTimezone } from './timezone.mjs';
import { sendPushToLearner, pushConfigured } from './push.mjs';
import { sendFcmToLearner, fcmConfigured } from './fcm.mjs';
import { sendWhatsAppToLearner, whatsappConfigured } from './whatsapp.mjs';
import { sendEmailToLearner, emailConfigured } from './email.mjs';
import { pickMorningMessage, pickMotivationMessage, pickMorningEmail, pickMotivationEmail, MOTIVATION_SLOTS } from '../domain/motivation.mjs';

// The Zomato/Swiggy pattern this follows: a notification only fires when a
// real condition in her own activity is true right now (streak about to
// break, gone quiet, a test sitting unfinished) -- never a blind timer.
// Each check also looks at today's/this-cycle's learning_event log before
// sending, so re-running this on a schedule never double-sends the same
// nudge in the same window.

async function alreadySentToday(learnerId, event) {
  const { rows } = await query(
    `SELECT 1 FROM learning_event
      WHERE learner_id = $1 AND event = $2
        AND created_at >= date_trunc('day', now())
      LIMIT 1`,
    [learnerId, event]
  );
  return rows.length > 0;
}

/** True if `event` fired for this learner within the last `minutes` -- used for the
 *  multiple-times-a-day motivation slots, where "once today" isn't fine-grained enough. */
async function alreadySentWithin(learnerId, event, minutes) {
  const { rows } = await query(
    `SELECT 1 FROM learning_event
      WHERE learner_id = $1 AND event = $2
        AND created_at >= now() - ($3 || ' minutes')::interval
      LIMIT 1`,
    [learnerId, event, String(minutes)]
  );
  return rows.length > 0;
}

/** Whether this is the first motivation slot to fire today (gets the morning message). */
async function isFirstMotivationSlotToday(learnerId) {
  return !(await alreadySentToday(learnerId, 'NOTIFY_MOTIVATION'));
}

async function notify(learnerId, event, payload) {
  await recordEvent(learnerId, event, null, { title: payload.title });
  // Logged, not swallowed -- a failure here (an expired WhatsApp token, the
  // recipient outside Meta's 24-hour window, a bad push subscription) used
  // to vanish entirely behind the scheduler's "sent:1" count, which only
  // reflects that this function ran, not that any channel actually delivered.
  if (pushConfigured) await sendPushToLearner(learnerId, payload).catch((err) => console.error(`[push] ${event} failed for ${learnerId}:`, err.message));
  if (fcmConfigured) await sendFcmToLearner(learnerId, payload).catch((err) => console.error(`[fcm] ${event} failed for ${learnerId}:`, err.message));
  // WhatsApp has no separate title/body chrome like a push notification
  // does -- it's just chat text, so the "reminder" framing has to be
  // spelled out in the message itself rather than implied by the UI.
  if (whatsappConfigured) {
    await sendWhatsAppToLearner(learnerId, `⏰ Reminder: ${payload.title}\n${payload.body}`).catch((err) =>
      console.error(`[whatsapp] ${event} failed for ${learnerId}:`, err.message)
    );
  }
}

/**
 * Motivation messages are a pep talk, not a reminder -- sent through the
 * same channels but without the "⏰ Reminder:" framing that fits a
 * streak/test nudge but would read oddly on "Good morning, Yashika."
 * WhatsApp and email get their own wording (see domain/motivation.mjs) --
 * same themes, deliberately different phrasing, so the two don't read
 * like copies of each other if she sees both.
 *
 * @param {string} learnerId
 * @param {string} event
 * @param {string} whatsappText short-form, for WhatsApp and the push/FCM body
 * @param {{subject: string, body: string}} emailMessage longer-form, for email only
 */
async function notifyMotivation(learnerId, event, whatsappText, emailMessage) {
  await recordEvent(learnerId, event, null, { whatsappText, emailSubject: emailMessage.subject });
  const payload = { title: 'Yash', body: whatsappText, tag: 'motivation' };
  if (pushConfigured) await sendPushToLearner(learnerId, payload).catch((err) => console.error(`[push] ${event} failed for ${learnerId}:`, err.message));
  if (fcmConfigured) await sendFcmToLearner(learnerId, payload).catch((err) => console.error(`[fcm] ${event} failed for ${learnerId}:`, err.message));
  if (whatsappConfigured) await sendWhatsAppToLearner(learnerId, whatsappText).catch((err) => console.error(`[whatsapp] ${event} failed for ${learnerId}:`, err.message));
  if (emailConfigured) {
    await sendEmailToLearner(learnerId, {
      subject: emailMessage.subject,
      text: emailMessage.body,
      html: motivationEmailHtml(emailMessage),
    }).catch((err) => console.error(`[email] ${event} failed for ${learnerId}:`, err.message));
  }
}

function motivationEmailHtml({ subject, body }) {
  const paragraphs = body
    .split('\n\n')
    .map((p) => `<p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px; white-space: pre-line;">${p}</p>`)
    .join('');
  return `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1E1B16; background: #FAF7F2;">
      <p style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #6B6459; margin: 0 0 12px;">Yash</p>
      <h2 style="font-size: 22px; margin: 0 0 16px; line-height: 1.3;">${subject}</h2>
      ${paragraphs}
      <a href="${process.env.APP_URL ?? 'http://localhost:3000'}"
         style="display: inline-block; background: #2F3192; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;">
        Open the app
      </a>
    </div>`;
}

/** All `role = 'learner'` accounts -- test/admin accounts never get engagement nudges. */
async function learnerAccounts() {
  const { rows } = await query(`SELECT learner_id FROM account WHERE role = 'learner'`);
  return rows.map((r) => r.learner_id);
}

/**
 * Fires once per learner, in the evening, if she has a streak worth losing
 * and hasn't studied anything today yet.
 */
export async function checkStreakAtRisk() {
  const hour = hourInAppTimezone();
  if (hour < 19) return { checked: 0, sent: 0 };

  let sent = 0;
  const learnerIds = await learnerAccounts();
  for (const learnerId of learnerIds) {
    const { rows } = await query(
      `SELECT DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS day FROM question_attempt WHERE learner_id = $1`,
      [learnerId]
    );
    const activeDates = rows.map((r) => r.day);
    const streak = computeStreak(activeDates);
    const today = dateKeyInAppTimezone();
    const activeToday = activeDates.includes(today);

    if (streak > 0 && !activeToday && !(await alreadySentToday(learnerId, 'NOTIFY_STREAK_RISK'))) {
      await notify(learnerId, 'NOTIFY_STREAK_RISK', {
        title: `Your ${streak}-day streak ends in a few hours`,
        body: 'One quick question keeps it alive. Open the app to continue.',
        tag: 'streak-risk',
      });
      sent += 1;
    }
  }
  return { checked: learnerIds.length, sent };
}

/** Fires once per day for anyone who has gone quiet for `inactiveDays` or more. */
export async function checkInactivity(inactiveDays = 2) {
  let sent = 0;
  const learnerIds = await learnerAccounts();
  for (const learnerId of learnerIds) {
    const { rows } = await query(
      `SELECT MAX(created_at) AS last_active FROM question_attempt WHERE learner_id = $1`,
      [learnerId]
    );
    const lastActive = rows[0]?.last_active;
    if (!lastActive) continue; // never started -- the onboarding flow owns that nudge, not this one

    const daysSince = (Date.now() - new Date(lastActive).getTime()) / 86_400_000;
    if (daysSince >= inactiveDays && !(await alreadySentToday(learnerId, 'NOTIFY_INACTIVITY'))) {
      await notify(learnerId, 'NOTIFY_INACTIVITY', {
        title: "It's been a few days",
        body: 'Your plan is still here, picking up right where you left off.',
        tag: 'inactivity',
      });
      sent += 1;
    }
  }
  return { checked: learnerIds.length, sent };
}

/**
 * Fires once per day for anyone who either has no weekly test in the last
 * 7 days, or has one sitting IN_PROGRESS and untouched for a while.
 */
export async function checkTestReminder() {
  let sent = 0;
  const learnerIds = await learnerAccounts();
  for (const learnerId of learnerIds) {
    const { rows: inProgress } = await query(
      `SELECT id FROM test WHERE learner_id = $1 AND status = 'IN_PROGRESS'
        AND started_at < now() - interval '1 day' ORDER BY started_at DESC LIMIT 1`,
      [learnerId]
    );
    const { rows: recent } = await query(
      `SELECT 1 FROM test WHERE learner_id = $1 AND status = 'COMPLETED'
        AND completed_at > now() - interval '7 days' LIMIT 1`,
      [learnerId]
    );

    if (await alreadySentToday(learnerId, 'NOTIFY_TEST_REMINDER')) continue;

    if (inProgress.length > 0) {
      await notify(learnerId, 'NOTIFY_TEST_REMINDER', {
        title: 'An unfinished weekly test is waiting',
        body: 'Pick up where you left off and see your score.',
        tag: 'test-reminder',
      });
      sent += 1;
    } else if (recent.length === 0) {
      await notify(learnerId, 'NOTIFY_TEST_REMINDER', {
        title: 'A fresh weekly test is ready',
        body: '25 questions across the full syllabus -- see where you really stand.',
        tag: 'test-reminder',
      });
      sent += 1;
    }
  }
  return { checked: learnerIds.length, sent };
}

/**
 * Motivational pep talks, 6am-11pm, roughly every 2 hours (see
 * MOTIVATION_SLOTS) -- unlike the three checks above, this one doesn't
 * wait for a specific condition in her activity; it's meant to be a
 * steady drumbeat through the day, the way a fitness or habit app keeps
 * nudging regardless of what you did an hour ago. The first slot of the
 * day gets the "good morning, start the day" message; every later slot
 * draws from the general pool so it doesn't repeat within a day.
 * Gated to a 90-minute window (not "today") since this fires multiple
 * times per day -- an hourly scheduler tick and a 2-hour slot spacing
 * means a 90-minute dedupe window catches exactly one send per slot.
 */
export async function checkMotivation() {
  const hour = hourInAppTimezone();
  if (!MOTIVATION_SLOTS.includes(hour)) return { checked: 0, sent: 0 };

  let sent = 0;
  const learnerIds = await learnerAccounts();
  for (const learnerId of learnerIds) {
    if (await alreadySentWithin(learnerId, 'NOTIFY_MOTIVATION', 90)) continue;

    const isMorning = await isFirstMotivationSlotToday(learnerId);
    const whatsappText = isMorning ? pickMorningMessage() : pickMotivationMessage();
    const emailMessage = isMorning ? pickMorningEmail() : pickMotivationEmail();
    await notifyMotivation(learnerId, 'NOTIFY_MOTIVATION', whatsappText, emailMessage);
    sent += 1;
  }
  return { checked: learnerIds.length, sent };
}
