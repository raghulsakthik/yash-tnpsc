// Phase 21 — PYQ Engine. PYQs are not a separate system: they are
// question.source LIKE 'tnpsc-%' rows in the exact same `question` table
// every other topic uses (seeded since before this session). These are the
// only two reads this phase needed — selecting specifically from that
// subset, and reporting how it compares to everything else — nothing here
// touches question_attempt's write path, recordAttempt(), or any existing
// selection route.
import { query } from '../lib/db.mjs';

// Mirrors GET /api/questions/next's own candidate query exactly (Phase 1,
// unchanged), with one added filter: only real past-paper-tagged questions.
export async function findPyqCandidatesForTopic(learnerId, topicId, client = { query }) {
  const result = await client.query(
    `SELECT q.id, q.prompt, q.options, q.difficulty::float8 AS difficulty,
            q.estimated_seconds, q.source,
            COUNT(a.id)::int AS seen_count,
            COALESCE(
              (SELECT COUNT(*) FROM question_attempt a2
                WHERE a2.learner_id = $1 AND a2.topic_id = $2
                  AND a2.created_at > MAX(a.created_at)), 999
            )::int AS attempts_since_last_seen
       FROM question q
       LEFT JOIN question_attempt a ON a.question_id = q.id AND a.learner_id = $1
      WHERE q.topic_id = $2 AND q.status = 'PUBLISHED' AND q.source LIKE 'tnpsc-%'
      GROUP BY q.id`,
    [learnerId, topicId]
  );
  return result.rows;
}

// PYQs as "another evidence source": how real past-paper performance
// compares to everything else, overall and per topic — a read over
// question_attempt/question exactly as they already exist, no new schema.
export async function findPyqVsAuthoredPerformance(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT t.id AS topic_id, t.name AS topic_name,
            (q.source LIKE 'tnpsc-%') AS is_pyq,
            COUNT(*)::int AS attempt_count,
            COUNT(*) FILTER (WHERE a.correct)::int AS correct_count
       FROM question_attempt a
       JOIN question q ON q.id = a.question_id
       JOIN topic t ON t.id = q.topic_id
      WHERE a.learner_id = $1
      GROUP BY t.id, t.name, (q.source LIKE 'tnpsc-%')`,
    [learnerId]
  );
  return result.rows;
}
