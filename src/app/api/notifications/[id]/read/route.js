import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/** POST /api/notifications/:id/read -- marks one real notification read, persisted. */
export async function POST(request, { params }) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });

  const { id } = await params;
  await query(
    `INSERT INTO notification_state (learner_id, notification_key, read_at)
     VALUES ($1, $2, now())
     ON CONFLICT (learner_id, notification_key) DO UPDATE SET read_at = COALESCE(notification_state.read_at, now())`,
    [learnerId, decodeURIComponent(id)]
  );
  return NextResponse.json({ saved: true });
}
