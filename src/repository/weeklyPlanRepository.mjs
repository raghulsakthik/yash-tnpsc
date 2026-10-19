// Phase 16 — the small reads the Weekly Plan Engine needs that nothing
// else exposes as a reusable function. Mirrors the same revision_schedule
// query /api/plan/today's route already runs inline, and reads the
// existing PYQ tagging (question.source LIKE 'tnpsc-%', content-audited at
// 137/322 questions) — no new schema either way.
import { query } from '../lib/db.mjs';

export async function findDueRevisionTopic(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT rs.topic_id, t.name AS topic_name, COUNT(*) OVER() AS due_count
       FROM revision_schedule rs JOIN topic t ON t.id = rs.topic_id
      WHERE rs.learner_id = $1 AND rs.status = 'SCHEDULED' AND rs.scheduled_at <= now()
      ORDER BY rs.scheduled_at ASC
      LIMIT 1`,
    [learnerId]
  );
  if (result.rows.length === 0) return { dueCount: 0, topic: null };
  const row = result.rows[0];
  return { dueCount: Number(row.due_count), topic: { topicId: row.topic_id, topicName: row.topic_name } };
}

// A topic with real PYQ-tagged questions, prioritizing one she's weaker on.
export async function findPyqCandidateTopic(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT q.topic_id, t.name AS topic_name, COUNT(*)::int AS pyq_count,
            COALESCE(s.accuracy_score::float8, 0) AS accuracy
       FROM question q
       JOIN topic t ON t.id = q.topic_id
       LEFT JOIN learner_topic_state s ON s.topic_id = q.topic_id AND s.learner_id = $1
      WHERE q.status = 'PUBLISHED' AND q.source LIKE 'tnpsc-%'
      GROUP BY q.topic_id, t.name, s.accuracy_score
      ORDER BY accuracy ASC, pyq_count DESC
      LIMIT 1`,
    [learnerId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { topicId: row.topic_id, topicName: row.topic_name, pyqCount: row.pyq_count };
}

export async function findTopicName(topicId, client = { query }) {
  const result = await client.query('SELECT name FROM topic WHERE id = $1', [topicId]);
  return result.rows[0]?.name ?? null;
}

export async function countCompletedDefaultAssessments(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS n FROM assessment WHERE learner_id = $1 AND type = 'DEFAULT_TEST' AND status = 'COMPLETED'`,
    [learnerId]
  );
  return result.rows[0].n;
}
