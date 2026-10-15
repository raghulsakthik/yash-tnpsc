import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../lib/db.mjs';
import { computeStreak } from '../../../domain/streak.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 *
 * A live, computed feed of what's actually true right now, filtered by
 * the learner's own preferences — not a delivery log. Nothing here is
 * ever marked "sent"; re-requesting always re-derives from current data,
 * so it can never drift from reality the way a stored notification queue
 * could.
 */
export async function GET() {
  try {
    const [{ rows: prefRows }, { rows: dueRows }, { rows: attemptDays }, { rows: recentMilestones }] = await Promise.all([
      query(`SELECT * FROM learner_notification_pref WHERE learner_id = $1`, [LEARNER_ID]),
      query(`SELECT COUNT(*)::int AS n FROM revision_schedule WHERE learner_id = $1 AND scheduled_at <= now()`, [LEARNER_ID]),
      query(`SELECT created_at FROM question_attempt WHERE learner_id = $1`, [LEARNER_ID]),
      query(
        `SELECT milestone_id, earned_at FROM learner_milestone
          WHERE learner_id = $1 AND earned_at >= now() - interval '24 hours'`,
        [LEARNER_ID]
      ),
    ]);

    const prefs = prefRows[0] ?? {
      daily_reminder: true,
      revision_due_alert: true,
      streak_at_risk: true,
      milestone_alert: true,
      weekly_review: false,
    };

    const streak = computeStreak(attemptDays.map((a) => a.created_at));
    const today = new Date().toISOString().slice(0, 10);
    const attemptedToday = attemptDays.some((a) => new Date(a.created_at).toISOString().slice(0, 10) === today);

    const items = [];

    if (prefs.revision_due_alert && dueRows[0]?.n > 0) {
      items.push({
        type: 'REVISION_DUE',
        title: `${dueRows[0].n} concept${dueRows[0].n === 1 ? '' : 's'} due for review`,
        href: '/proto/revision',
      });
    }

    if (prefs.streak_at_risk && streak.current > 0 && !attemptedToday) {
      items.push({
        type: 'STREAK_AT_RISK',
        title: `Your ${streak.current}-day streak is still open today`,
        href: '/proto/home',
      });
    }

    if (prefs.milestone_alert) {
      for (const m of recentMilestones) {
        items.push({
          type: 'MILESTONE_EARNED',
          title: `Milestone earned: ${m.milestone_id.replace(/-/g, ' ')}`,
          href: '/proto/milestones',
          at: m.earned_at,
        });
      }
    }

    if (prefs.daily_reminder && !attemptedToday) {
      items.push({ type: 'DAILY_REMINDER', title: 'No session yet today', href: '/proto/home' });
    }

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ code: 'NOTIFICATIONS_FAILED', message: err.message }, { status: 500 });
  }
}
