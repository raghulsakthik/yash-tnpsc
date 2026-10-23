// Phase 2 — Learner repository. Thin wrapper over `learner`/`learner_profile`,
// reusing the existing pool/query from src/lib/db.mjs rather than introducing
// a second connection path.
import { query } from '../lib/db.mjs';

export async function createLearner({ name }, client = { query }) {
  const result = await client.query(
    'INSERT INTO learner (name) VALUES ($1) RETURNING id, name, created_at, updated_at',
    [name]
  );
  return result.rows[0];
}

export async function findLearnerById(id, client = { query }) {
  const result = await client.query('SELECT id, name, created_at, updated_at FROM learner WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createLearnerProfile({ learnerId, exam, language, dailyGoalMinutes }, client = { query }) {
  const result = await client.query(
    `INSERT INTO learner_profile (learner_id, exam, language, daily_goal_minutes)
     VALUES ($1, COALESCE($2, 'tnpsc-prelims-495'), COALESCE($3, 'en'), COALESCE($4, 30))
     ON CONFLICT (learner_id) DO UPDATE SET
       exam = EXCLUDED.exam, language = EXCLUDED.language,
       daily_goal_minutes = EXCLUDED.daily_goal_minutes, updated_at = now()
     RETURNING learner_id, exam, language, daily_goal_minutes, updated_at`,
    [learnerId, exam, language, dailyGoalMinutes]
  );
  return result.rows[0];
}
