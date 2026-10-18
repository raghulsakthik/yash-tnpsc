import { query } from './db.mjs';
import { earnedAchievementIds } from '../domain/achievements.mjs';
import { computeStreak } from '../domain/progress.mjs';
import { sendPushToLearner, pushConfigured } from './push.mjs';
import { sendFcmToLearner, fcmConfigured } from './fcm.mjs';
import { sendWhatsAppToLearner, whatsappConfigured } from './whatsapp.mjs';

/**
 * Computes real stats, diffs against what's already unlocked, inserts any
 * newly-earned achievement rows, and pushes a notification for each one --
 * this is the "activity in the app triggers a notification" loop for
 * achievements specifically. Call it after any event that could unlock
 * something: a graded attempt, a completed test, a cleared mistake.
 *
 * @param {string} learnerId
 * @returns {Promise<Array<{id: string, name: string, icon: string}>>} achievements newly unlocked this call
 */
export async function checkAndUnlockAchievements(learnerId) {
  const [
    { rows: totals },
    { rows: streakRows },
    { rows: masteredRows },
    { rows: testRows },
    { rows: bestScoreRows },
    { rows: mistakeRows },
    { rows: alreadyRows },
    { rows: achievementRows },
  ] = await Promise.all([
    query(`SELECT COUNT(*)::int AS n FROM question_attempt WHERE learner_id = $1`, [learnerId]),
    query(
      `SELECT DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS day FROM question_attempt WHERE learner_id = $1`,
      [learnerId]
    ),
    query(`SELECT COUNT(*)::int AS n FROM learner_topic_state WHERE learner_id = $1 AND mastery_score >= 0.85`, [learnerId]),
    query(`SELECT COUNT(*)::int AS n FROM test WHERE learner_id = $1 AND status = 'COMPLETED'`, [learnerId]),
    query(`SELECT MAX(score)::float8 AS best FROM test WHERE learner_id = $1 AND status = 'COMPLETED'`, [learnerId]),
    query(
      `SELECT COUNT(DISTINCT qa_fix.question_id)::int AS n
         FROM question_attempt qa_fix
        WHERE qa_fix.learner_id = $1 AND qa_fix.correct = true
          AND EXISTS (
            SELECT 1 FROM question_attempt qa_wrong
             WHERE qa_wrong.learner_id = qa_fix.learner_id
               AND qa_wrong.question_id = qa_fix.question_id
               AND qa_wrong.correct = false
               AND qa_wrong.created_at < qa_fix.created_at
          )`,
      [learnerId]
    ),
    query(`SELECT achievement_id FROM learner_achievement WHERE learner_id = $1`, [learnerId]),
    query(`SELECT id, name, icon FROM achievement`),
  ]);

  const activeDates = streakRows.map((r) => r.day);
  const streak = computeStreak(activeDates);
  const alreadyUnlocked = new Set(alreadyRows.map((r) => r.achievement_id));
  const achievementById = new Map(achievementRows.map((a) => [a.id, a]));

  const earnedIds = earnedAchievementIds({
    questionsSolved: totals[0]?.n ?? 0,
    streak,
    topicsMastered: masteredRows[0]?.n ?? 0,
    testsCompleted: testRows[0]?.n ?? 0,
    bestTestScore: bestScoreRows[0]?.best ?? 0,
    mistakesCleared: mistakeRows[0]?.n ?? 0,
  });

  const newlyUnlocked = earnedIds.filter((id) => !alreadyUnlocked.has(id) && achievementById.has(id));
  if (newlyUnlocked.length === 0) return [];

  for (const id of newlyUnlocked) {
    await query(
      `INSERT INTO learner_achievement (learner_id, achievement_id) VALUES ($1, $2)
       ON CONFLICT (learner_id, achievement_id) DO NOTHING`,
      [learnerId, id]
    );
  }

  const unlocked = newlyUnlocked.map((id) => achievementById.get(id));

  for (const achievement of unlocked) {
    const payload = {
      title: `${achievement.icon} Achievement unlocked: ${achievement.name}`,
      body: achievement.description ?? 'Keep going.',
      tag: `achievement-${achievement.id}`,
    };
    if (pushConfigured) await sendPushToLearner(learnerId, payload).catch((err) => console.error(`[push] achievement send failed for ${learnerId}:`, err.message));
    if (fcmConfigured) await sendFcmToLearner(learnerId, payload).catch((err) => console.error(`[fcm] achievement send failed for ${learnerId}:`, err.message));
    if (whatsappConfigured) await sendWhatsAppToLearner(learnerId, `${payload.title}\n${payload.body}`).catch((err) => console.error(`[whatsapp] achievement send failed for ${learnerId}:`, err.message));
  }

  return unlocked;
}
