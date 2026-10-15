import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  dailyReminder: true,
  revisionDueAlert: true,
  streakAtRisk: true,
  milestoneAlert: true,
  weeklyReview: false,
};

function toJson(row) {
  if (!row) return DEFAULTS;
  return {
    dailyReminder: row.daily_reminder,
    revisionDueAlert: row.revision_due_alert,
    streakAtRisk: row.streak_at_risk,
    milestoneAlert: row.milestone_alert,
    weeklyReview: row.weekly_review,
  };
}

export async function GET() {
  const { rows } = await query(`SELECT * FROM learner_notification_pref WHERE learner_id = $1`, [LEARNER_ID]);
  return NextResponse.json(toJson(rows[0]));
}

/** PUT /api/notifications/preferences — body: any subset of the five booleans above. */
export async function PUT(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const current = toJson((await query(`SELECT * FROM learner_notification_pref WHERE learner_id = $1`, [LEARNER_ID])).rows[0]);
  const next = { ...current, ...body };

  await query(
    `INSERT INTO learner_notification_pref
       (learner_id, daily_reminder, revision_due_alert, streak_at_risk, milestone_alert, weekly_review, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6, now())
     ON CONFLICT (learner_id) DO UPDATE SET
       daily_reminder = EXCLUDED.daily_reminder,
       revision_due_alert = EXCLUDED.revision_due_alert,
       streak_at_risk = EXCLUDED.streak_at_risk,
       milestone_alert = EXCLUDED.milestone_alert,
       weekly_review = EXCLUDED.weekly_review,
       updated_at = now()`,
    [LEARNER_ID, next.dailyReminder, next.revisionDueAlert, next.streakAtRisk, next.milestoneAlert, next.weeklyReview]
  );

  return NextResponse.json(next);
}
