import { query } from './db.mjs';

// WhatsApp Cloud API (Meta). Free-form text messages only work inside the
// 24-hour customer-service window -- i.e. the recipient must have messaged
// the business number first, or be added as a test recipient in the Meta
// dev console for a development app. Outside that window, Meta requires a
// pre-approved template message instead of plain text.
const GRAPH_API_VERSION = 'v25.0';

export const whatsappConfigured = Boolean(
  process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
);

/**
 * Sends a WhatsApp text message to whatever number the learner has set as
 * notify_whatsapp. Throws a clear, specific error rather than failing
 * silently -- like email, there's exactly one destination, so a failure
 * here is always worth surfacing.
 *
 * @param {string} learnerId
 * @param {string} body plain text, under ~4096 chars
 * @returns {Promise<{to: string}>}
 */
export async function sendWhatsAppToLearner(learnerId, body) {
  if (!whatsappConfigured) {
    throw new Error('WhatsApp is not configured on the server (missing WHATSAPP_* env vars)');
  }

  const { rows } = await query(`SELECT notify_whatsapp FROM learner_profile WHERE learner_id = $1`, [learnerId]);
  const to = rows[0]?.notify_whatsapp;
  if (!to) {
    throw new Error('No WhatsApp number is set yet');
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message ?? `WhatsApp send failed (HTTP ${res.status})`);
  }

  return { to };
}
