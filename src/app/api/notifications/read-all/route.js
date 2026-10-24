import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { listNotificationIds } from '../../../../lib/notifications.mjs';

export const dynamic = 'force-dynamic';

/** POST /api/notifications/read-all -- marks every real, currently-visible notification read. */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });

  const ids = await listNotificationIds(learnerId);
  if (ids.length) {
    const values = ids.map((_, i) => `($1, $${i + 2}, now())`).join(',');
    await query(
      `INSERT INTO notification_state (learner_id, notification_key, read_at)
       VALUES ${values}
       ON CONFLICT (learner_id, notification_key) DO UPDATE SET read_at = COALESCE(notification_state.read_at, now())`,
      [learnerId, ...ids]
    );
  }
  return NextResponse.json({ saved: true, count: ids.length });
}
