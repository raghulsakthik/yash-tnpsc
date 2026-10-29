import webpush from 'web-push';
import { query } from './db.mjs';

// A malformed VAPID_SUBJECT (missing "mailto:"/"https:", a stray
// placeholder value, etc) makes web-push throw synchronously here --
// uncaught, that crashes this module's import, which crashes every route
// that imports it (including ones that don't even send push). Caught and
// downgraded to "not configured" instead, same as a missing key: push
// just silently doesn't fire rather than taking the rest of the app down
// with it.
let configured = Boolean(process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) &&
  Boolean(process.env.VAPID_PRIVATE_KEY);

if (configured) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    configured = false;
    console.error('[push] VAPID configuration invalid, push notifications disabled:', err.message);
  }
}

/**
 * Sends a notification to every device a learner has subscribed on.
 * A subscription that the push service reports as gone (410/404) is
 * removed -- she unsubscribed or uninstalled, no retrying that endpoint.
 *
 * @param {string} learnerId
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 * @returns {Promise<{ sent: number, removed: number }>}
 */
export async function sendPushToLearner(learnerId, payload) {
  if (!configured) {
    throw new Error('Push notifications are not configured (missing VAPID keys)');
  }

  const { rows } = await query(
    `SELECT id, endpoint, p256dh, auth FROM push_subscription WHERE learner_id = $1`,
    [learnerId]
  );

  let sent = 0;
  let removed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          JSON.stringify(payload)
        );
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await query(`DELETE FROM push_subscription WHERE id = $1`, [row.id]);
          removed += 1;
        }
        // Any other failure (network blip, provider outage) is left alone
        // to retry on the next real trigger rather than deleted here.
      }
    })
  );

  return { sent, removed };
}

export const pushConfigured = configured;
