// Phase 17 — repository for the new `achievement` table (V10).
import { query } from '../lib/db.mjs';

export async function findUnlockedAchievements(learnerId, client = { query }) {
  const result = await client.query(
    'SELECT milestone_type, achieved_at, metadata FROM achievement WHERE learner_id = $1 ORDER BY achieved_at ASC',
    [learnerId]
  );
  return result.rows;
}

/**
 * Idempotent: ON CONFLICT DO NOTHING means calling this for an
 * already-unlocked milestone is a safe no-op, not a duplicate or an error.
 * @returns the inserted row, or null if it was already unlocked
 */
export async function recordAchievement({ learnerId, milestoneType, achievedAt, metadata = {} }, client = { query }) {
  const result = await client.query(
    `INSERT INTO achievement (learner_id, milestone_type, achieved_at, metadata)
     VALUES ($1, $2, COALESCE($3, now()), $4)
     ON CONFLICT (learner_id, milestone_type) DO NOTHING
     RETURNING milestone_type, achieved_at, metadata`,
    [learnerId, milestoneType, achievedAt, metadata]
  );
  return result.rows[0] ?? null;
}
