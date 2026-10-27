// Sends SMS through TextBee (a real Android phone's SIM acting as the
// gateway) -- unlike email-to-carrier-gateway tricks (the old Textbelt
// approach), this actually works for Indian carriers since it's a real
// phone sending a real text.
export const textbeeConfigured = Boolean(
  process.env.TEXTBEE_API_KEY && process.env.TEXTBEE_DEVICE_ID
);

export async function sendTextbeeSms(recipients, message) {
  if (!textbeeConfigured) {
    throw new Error('TextBee is not configured (missing TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID)');
  }
  const url = `https://api.textbee.dev/api/v1/gateway/devices/${process.env.TEXTBEE_DEVICE_ID}/send-sms`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.TEXTBEE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipients, message }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.data?.success !== true) {
    throw new Error(`TextBee send failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body.data;
}
