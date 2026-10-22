import { query } from '../lib/db.mjs';

export async function getReadinessEvidence(learnerId, client = { query }) {
  const [mastery, tests, pyq, coverage, subjects, activity] = await Promise.all([
    client.query(`SELECT AVG(accuracy_score)::float8 AS accuracy, AVG(speed_score)::float8 AS speed,
                         AVG(current_difficulty)::float8 AS difficulty,
                         AVG(attempt_count)::float8 AS attempts
                    FROM learner_topic_state WHERE learner_id=$1 AND attempt_count > 0`, [learnerId]),
    client.query(`SELECT COUNT(*)::int AS completed, COALESCE(AVG(score),0)::float8 AS avg_score,
                         COALESCE((ARRAY_AGG(score ORDER BY completed_at DESC))[1],0)::float8 AS latest_score
                    FROM test WHERE learner_id=$1 AND status='COMPLETED' AND score IS NOT NULL`, [learnerId]),
    client.query(`SELECT COUNT(*)::int AS attempts,
                         COALESCE(AVG(CASE WHEN a.correct THEN 1.0 ELSE 0.0 END),0)::float8 AS accuracy
                    FROM question_attempt a JOIN question q ON q.id=a.question_id
                   WHERE a.learner_id=$1 AND q.source LIKE 'tnpsc-%'`, [learnerId]),
    client.query(`SELECT COUNT(DISTINCT s.id)::int AS total
                    FROM subject s JOIN chapter c ON c.subject_id=s.id JOIN topic t ON t.chapter_id=c.id
                    JOIN question q ON q.topic_id=t.id WHERE q.status='PUBLISHED'`, []),
    client.query(`SELECT COUNT(DISTINCT s.id)::int AS touched
                    FROM learner_topic_state lts JOIN topic t ON t.id=lts.topic_id
                    JOIN chapter c ON c.id=t.chapter_id JOIN subject s ON s.id=c.subject_id
                   WHERE lts.learner_id=$1 AND lts.attempt_count > 0`, [learnerId]),
    client.query(`SELECT COUNT(DISTINCT (created_at AT TIME ZONE 'UTC')::date)::int AS active_days
                    FROM question_attempt WHERE learner_id=$1 AND created_at > now()-interval '30 days'`, [learnerId]),
  ]);
  return { mastery: mastery.rows[0], tests: tests.rows[0], pyq: pyq.rows[0], coverage: coverage.rows[0], subjects: subjects.rows[0], activity: activity.rows[0] };
}

export async function getLatestReadinessSnapshot(learnerId, client = { query }) {
  const r = await client.query(`SELECT overall_score::float8 AS overall_score, breakdown, computed_at
                                  FROM readiness_snapshot WHERE learner_id=$1 ORDER BY computed_at DESC LIMIT 1`, [learnerId]);
  return r.rows[0] ?? null;
}

export async function saveReadinessSnapshot({ learnerId, overall, breakdown }, client = { query }) {
  const r = await client.query(`INSERT INTO readiness_snapshot(learner_id,overall_score,breakdown)
                                VALUES($1,$2,$3::jsonb) RETURNING id,computed_at`, [learnerId, overall, JSON.stringify(breakdown)]);
  return r.rows[0];
}
