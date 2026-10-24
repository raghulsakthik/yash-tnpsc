import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { listNotificationIds } from '../../../../lib/notifications.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/clear -- dismisses every real, currently-visible
 * notification (hides them from the feed). Never deletes the underlying
 * achievement/event rows -- those are real history, not notification
 * state, and stay intact.
 */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });

  const ids = await listNotificationIds(learnerId);
  if (ids.length) {
    const values = ids.map((_, i) => `($1, $${i + 2}, now())`).join(',');
    await query(
      `INSERT INTO notification_state (learner_id, notification_key, dismissed_at)
       VALUES ${values}
       ON CONFLICT (learner_id, notification_key) DO UPDATE SET dismissed_at = now()`,
      [learnerId, ...ids]
    );
  }
  return NextResponse.json({ saved: true, count: ids.length });
}
