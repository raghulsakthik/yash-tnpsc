import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push/fcm/register
 * body: { token: string, deviceInfo?: string }
 *
 * Called by the Android app once it has an FCM registration token (from
 * FirebaseMessaging.getInstance().token, typically in
 * MainActivity.onCreate or a FirebaseMessagingService.onNewToken
 * override). Upserts by token so a refreshed token on the same device
 * just replaces the old row rather than duplicating.
 */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const { token, deviceInfo } = body;
  if (!token) {
    return NextResponse.json({ code: 'MISSING_TOKEN', message: 'A valid FCM token is required' }, { status: 400 });
  }

  try {
    await query(
      `INSERT INTO fcm_token (learner_id, token, device_info) VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET learner_id = EXCLUDED.learner_id, device_info = EXCLUDED.device_info`,
      [learnerId, token, deviceInfo ?? null]
    );
    return NextResponse.json({ registered: true });
  } catch (err) {
    return NextResponse.json({ code: 'REGISTER_FAILED', message: err.message }, { status: 500 });
  }
}
