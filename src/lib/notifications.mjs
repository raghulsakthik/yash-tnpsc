import { query } from './db.mjs';

// Shared with src/app/api/notifications/route.js and the clear-all route --
// the one place that knows how a notification's stable id is derived from
// its real underlying achievement/event row.
export const NUDGE_EVENTS = {
  NOTIFY_STREAK_RISK: true,
  NOTIFY_INACTIVITY: true,
  NOTIFY_TEST_REMINDER: true,
  NOTIFY_MOTIVATION: true,
  ADMIN_BROADCAST: true,
};

const LIMIT = 40;

/** Every real, currently-visible notification id for this learner (ignores read/dismiss state). */
export async function listNotificationIds(learnerId) {
  const [{ rows: achievements }, { rows: events }] = await Promise.all([
    query(
      `SELECT achievement_id FROM learner_achievement WHERE learner_id = $1 ORDER BY unlocked_at DESC LIMIT $2`,
      [learnerId, LIMIT]
    ),
    query(
      `SELECT event, created_at FROM learning_event WHERE learner_id = $1 AND event = ANY($2) ORDER BY created_at DESC LIMIT $3`,
      [learnerId, Object.keys(NUDGE_EVENTS), LIMIT]
    ),
  ]);
  return [
    ...achievements.map((a) => `achievement:${a.achievement_id}`),
    ...events.map((e) => `nudge:${e.event}:${new Date(e.created_at).toISOString()}`),
  ];
}
