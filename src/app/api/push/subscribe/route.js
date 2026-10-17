import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push/subscribe
 * body: { subscription: PushSubscriptionJSON, userAgent?: string }
 *
 * Upserts by endpoint, so re-subscribing on the same browser (e.g. after
 * clearing the service worker) just refreshes the keys rather than
 * duplicating.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const { subscription, userAgent } = body;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ code: 'INVALID_SUBSCRIPTION', message: 'A valid push subscription is required' }, { status: 400 });
  }

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    await query(
      `INSERT INTO push_subscription (learner_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_agent = EXCLUDED.user_agent`,
      [learnerId, endpoint, p256dh, auth, userAgent ?? null]
    );
    return NextResponse.json({ subscribed: true });
  } catch (err) {
    return NextResponse.json({ code: 'SUBSCRIBE_FAILED', message: err.message }, { status: 500 });
  }
}
