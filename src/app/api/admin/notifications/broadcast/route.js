import { NextResponse } from 'next/server';
import { query, recordEvent } from '../../../../../lib/db.mjs';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { sendPushToLearner } from '../../../../../lib/push.mjs';
import { sendFcmToLearner } from '../../../../../lib/fcm.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/notifications/broadcast
 * body: { title, message, targetAudience?: 'ALL_LEARNERS' }
 *
 * The real backend for Admin Portal's "Dispatch Announcement" form, which
 * previously only ever updated local React state -- no admin "send" ever
 * reached a real learner. This fans the message out to every real learner
 * account (role = 'STUDENT'): a learning_event row per learner so it shows
 * up in that learner's real /api/notifications feed (same feed Android's
 * Notifications screen already reads), plus a best-effort real push
 * (web push + FCM) to whatever devices they've registered.
 */
export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const targetAudience = body.targetAudience === 'ALL_LEARNERS' ? 'ALL_LEARNERS' : 'ALL_LEARNERS';

  if (!title || !message) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Title and message are required.' }, { status: 400 });
  }

  try {
    const { rows: learners } = await query(`SELECT id FROM app_user WHERE role = 'STUDENT'`);

    await Promise.all(
      learners.map((learner) =>
        recordEvent(learner.id, 'ADMIN_BROADCAST', null, { title, message })
      )
    );

    const pushResults = await Promise.allSettled(
      learners.flatMap((learner) => [
        sendPushToLearner(learner.id, { title, body: message }).catch(() => null),
        sendFcmToLearner(learner.id, { title, body: message }).catch(() => null),
      ])
    );
    void pushResults; // best-effort -- delivery to the feed above already happened regardless of push success

    const { rows: inserted } = await query(
      `INSERT INTO admin_broadcast (title, message, target_audience, created_by, recipient_count)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, message, target_audience, recipient_count, created_at`,
      [title, message, targetAudience, admin.id ?? admin.accountId, learners.length]
    );
    const broadcast = inserted[0];

    return NextResponse.json({
      broadcast: {
        id: broadcast.id,
        title: broadcast.title,
        message: broadcast.message,
        targetAudience: broadcast.target_audience,
        recipientCount: broadcast.recipient_count,
        createdAt: broadcast.created_at,
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ code: 'BROADCAST_FAILED', message: err.message }, { status: 500 });
  }
}
