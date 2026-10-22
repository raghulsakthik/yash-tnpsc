import webpush from 'web-push';
import { query } from './db.mjs';

const configured = Boolean(process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) &&
  Boolean(process.env.VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
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
