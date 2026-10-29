import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../../lib/auth.mjs';
import { sendFcmToLearner, fcmConfigured } from '../../../../../lib/fcm.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push/fcm/test
 *
 * Sends one real FCM push to every Android device this learner has
 * registered a token on, so the "does push actually work" question has a
 * real answer in seconds instead of waiting for the next real nudge to
 * silently fail. Mirrors /api/push/test (the web-push equivalent).
 */
export async function POST(request) {
  if (!fcmConfigured) {
    return NextResponse.json(
      { code: 'FCM_NOT_CONFIGURED', message: 'FIREBASE_SERVICE_ACCOUNT_JSON is not set on the server' },
      { status: 503 }
    );
  }

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const result = await sendFcmToLearner(learnerId, {
      title: 'Push notifications are on',
      body: "You'll hear from here when something needs you.",
      tag: 'test',
    });
    if (result.sent === 0) {
      return NextResponse.json(
        { code: 'NO_DEVICES', message: 'No registered FCM token for this account -- open the app and log in first.', ...result },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'PUSH_FAILED', message: err.message }, { status: 500 });
  }
}
