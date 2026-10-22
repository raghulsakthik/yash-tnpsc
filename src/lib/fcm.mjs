import { query } from './db.mjs';

// Sends Android push via Firebase Cloud Messaging. Needs a Firebase
// project's service account key -- create one free at
// console.firebase.google.com, download the service account JSON from
// Project Settings > Service Accounts > Generate New Private Key, and set
// FIREBASE_SERVICE_ACCOUNT_JSON to its full contents (as one JSON string).
// Until that's set, every call here is a safe, silent no-op -- same
// pattern as push.mjs (Web Push) and email.mjs.
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const configured = Boolean(rawServiceAccount);

let messagingPromise = null;

async function getMessaging() {
  if (!configured) return null;
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const { initializeApp, getApps, cert } = await import('firebase-admin/app');
      const { getMessaging: getMessagingSdk } = await import('firebase-admin/messaging');
      const serviceAccount = JSON.parse(rawServiceAccount);
      const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
      return getMessagingSdk(app);
    })();
  }
  return messagingPromise;
}

/**
 * Sends a notification to every Android device a learner has registered.
 * A token the SDK reports as unregistered is removed -- she uninstalled
 * or the token rotated, no retrying that one.
 *
 * @param {string} learnerId
 * @param {{ title: string, body: string, tag?: string, url?: string }} payload
 * @returns {Promise<{ sent: number, removed: number }>}
 */
export async function sendFcmToLearner(learnerId, payload) {
  const messaging = await getMessaging();
  if (!messaging) {
    throw new Error('FCM is not configured (missing FIREBASE_SERVICE_ACCOUNT_JSON)');
  }

  const { rows } = await query(`SELECT id, token FROM fcm_token WHERE learner_id = $1`, [learnerId]);

  let sent = 0;
  let removed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await messaging.send({
          token: row.token,
          notification: { title: payload.title, body: payload.body },
          data: { tag: payload.tag ?? '', url: payload.url ?? '' },
        });
        sent += 1;
      } catch (err) {
        if (err.code === 'messaging/registration-token-not-registered') {
          await query(`DELETE FROM fcm_token WHERE id = $1`, [row.id]);
          removed += 1;
        }
      }
    })
  );

  return { sent, removed };
}

export const fcmConfigured = configured;
