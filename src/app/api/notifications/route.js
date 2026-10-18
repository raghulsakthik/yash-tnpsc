import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';
import { requireLearnerId } from '../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

// Nudge-type learning_events already written by src/lib/activityNotifications.mjs
// -- the same events that trigger push/email/WhatsApp also become an
// in-app feed entry, so what she was notified about outside the app is
// also visible inside it (there was no in-app record of any of this before).
const NUDGE_EVENTS = {
  NOTIFY_STREAK_RISK: { icon: '🔥', title: 'Streak reminder' },
  NOTIFY_INACTIVITY: { icon: '👋', title: "It's been a few days" },
  NOTIFY_TEST_REMINDER: { icon: '📝', title: 'Test reminder' },
  NOTIFY_MOTIVATION: { icon: '✦', title: 'A nudge' },
};

const LIMIT = 40;

/** GET /api/notifications -- real achievement unlocks + real engagement nudges, merged and time-sorted. */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const [{ rows: achievements }, { rows: events }] = await Promise.all([
      query(
        `SELECT la.unlocked_at, a.name, a.description, a.icon
           FROM learner_achievement la JOIN achievement a ON a.id = la.achievement_id
          WHERE la.learner_id = $1
          ORDER BY la.unlocked_at DESC LIMIT $2`,
        [learnerId, LIMIT]
      ),
      query(
        `SELECT event, metadata, created_at FROM learning_event
          WHERE learner_id = $1 AND event = ANY($2)
          ORDER BY created_at DESC LIMIT $3`,
        [learnerId, Object.keys(NUDGE_EVENTS), LIMIT]
      ),
    ]);

    const items = [
      ...achievements.map((a) => ({
        type: 'achievement',
        icon: a.icon,
        title: `Achievement unlocked: ${a.name}`,
        body: a.description,
        at: a.unlocked_at,
      })),
      ...events.map((e) => ({
        type: 'nudge',
        icon: NUDGE_EVENTS[e.event]?.icon ?? '🔔',
        title: NUDGE_EVENTS[e.event]?.title ?? e.event,
        body: e.metadata?.title ?? e.metadata?.whatsappText ?? null,
        at: e.created_at,
      })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, LIMIT);

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ code: 'NOTIFICATIONS_FAILED', message: err.message }, { status: 500 });
  }
}
