import { NextResponse } from 'next/server';
import { pool, query } from '../../../lib/db.mjs';
import { getSession } from '../../../lib/auth.mjs';
import { computeStreak, longestStreak } from '../../../domain/progress.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile
 *
 * Learner identity, preferences and real totals/streak — no fabricated
 * stats. "Total learning minutes" is omitted: nothing tracks session
 * duration, only per-question time, so a sum of those would overstate
 * real study time (thinking time between questions isn't captured).
 */
export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }
  if (!session.learnerId) {
    // Admin accounts have no learner row -- just identity, no progress stats.
    return NextResponse.json({ name: session.email, role: session.role, email: session.email });
  }
  const learnerId = session.learnerId;

  try {
    const [{ rows: learnerRows }, { rows: profileRows }, { rows: activityRows }, { rows: totals }, { rows: masteredRows }, { rows: testRows }, { rows: goalRows }] =
      await Promise.all([
        query(`SELECT id, name, created_at FROM learner WHERE id = $1`, [learnerId]),
        query(`SELECT exam, language, daily_goal_minutes, onboarded, phone FROM learner_profile WHERE learner_id = $1`, [learnerId]),
        query(
          `SELECT DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS day
             FROM question_attempt WHERE learner_id = $1`,
          [learnerId]
        ),
        query(`SELECT COUNT(*)::int AS n FROM question_attempt WHERE learner_id = $1`, [learnerId]),
        query(
          `SELECT COUNT(*)::int AS n FROM learner_topic_state WHERE learner_id = $1 AND mastery_score >= 0.85`,
          [learnerId]
        ),
        query(`SELECT COUNT(*)::int AS n FROM test WHERE learner_id = $1 AND status = 'COMPLETED'`, [learnerId]),
        query(`SELECT (
          COALESCE((SELECT SUM(u.estimated_minutes) FROM learner_curriculum lc JOIN learning_unit u ON u.day_id=lc.current_day_id JOIN learner_unit_progress lup ON lup.unit_id=u.id AND lup.learner_id=$1 WHERE lc.learner_id=$1 AND lc.status='ACTIVE' AND lup.status='COMPLETED'),0)
          + COALESCE((SELECT SUM((metadata->>'minutes')::int) FROM learning_event WHERE learner_id=$1 AND event='STUDY_MINUTES_LOGGED' AND created_at::date=(now() AT TIME ZONE 'Asia/Kolkata')::date),0)
        )::int AS minutes`, [learnerId]),
      ]);

    if (learnerRows.length === 0) {
      return NextResponse.json({ code: 'LEARNER_NOT_FOUND', message: 'No learner configured' }, { status: 404 });
    }

    const activeDates = activityRows.map((r) => r.day);

    return NextResponse.json({
      name: learnerRows[0].name,
      role: session.role,
      email: session.email,
      since: learnerRows[0].created_at,
      exam: profileRows[0]?.exam ?? null,
      language: profileRows[0]?.language ?? 'en',
      dailyGoalMinutes: profileRows[0]?.daily_goal_minutes ?? 30,
      phone: profileRows[0]?.phone ?? null,
      onboarded: profileRows[0]?.onboarded ?? true,
      streak: computeStreak(activeDates),
      longestStreak: longestStreak(activeDates),
      questionsSolved: totals[0]?.n ?? 0,
      topicsMastered: masteredRows[0]?.n ?? 0,
      testsCompleted: testRows[0]?.n ?? 0,
      todayLearningMinutes: goalRows[0]?.minutes ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ code: 'PROFILE_FAILED', message: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/profile
 *
 * Persists real identity/contact/notification preferences. Email stays
 * read-only here -- it's the account's login identity (app_user.email),
 * not a profile field, and changing it needs its own re-verification
 * flow, not a silent profile save.
 */
export async function PUT(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }
  if (!session.learnerId) {
    return NextResponse.json({ code: 'NO_LEARNER_PROFILE', message: 'Admin accounts have no learner profile' }, { status: 400 });
  }
  const learnerId = session.learnerId;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;
  const phoneProvided = typeof body.phone === 'string';
  const phone = phoneProvided ? body.phone.trim() || null : null;
  const dailyGoalMinutes = Number.isInteger(body.dailyGoalMinutes) ? Math.max(15, Math.min(body.dailyGoalMinutes, 720)) : null;
  const emailNotificationsProvided = typeof body.emailNotifications === 'boolean';
  const smsNotificationsProvided = typeof body.smsNotifications === 'boolean';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (name) await client.query('UPDATE learner SET name = $2 WHERE id = $1', [learnerId, name]);
    await client.query(
      `UPDATE learner_profile SET
         phone = CASE WHEN $2::boolean THEN $3 ELSE phone END,
         daily_goal_minutes = COALESCE($4, daily_goal_minutes),
         notify_email = CASE WHEN $5::boolean THEN (CASE WHEN $6::boolean THEN $7 ELSE NULL END) ELSE notify_email END,
         notify_whatsapp = CASE WHEN $8::boolean THEN (CASE WHEN $9::boolean THEN $10 ELSE NULL END) ELSE notify_whatsapp END,
         updated_at = now()
       WHERE learner_id = $1`,
      [
        learnerId,
        phoneProvided, phone,
        dailyGoalMinutes,
        emailNotificationsProvided, body.emailNotifications, session.email,
        smsNotificationsProvided, body.smsNotifications, phoneProvided ? phone : null,
      ]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    return NextResponse.json({ code: 'PROFILE_SAVE_FAILED', message: err.message }, { status: 500 });
  }
  client.release();

  return NextResponse.json({
    saved: true,
    name: name ?? undefined,
    phone: phoneProvided ? phone : undefined,
    dailyGoalMinutes: dailyGoalMinutes ?? undefined,
    emailNotifications: emailNotificationsProvided ? body.emailNotifications : undefined,
    smsNotifications: smsNotificationsProvided ? body.smsNotifications : undefined,
  });
}
