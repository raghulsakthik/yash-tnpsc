// Phase 23 — the two reads the Cross-Subject Adaptive Engine needs: a real,
// subject-level aggregate of learner state (reading learner_topic_state
// exactly as every other phase does, nothing new), and which subjects
// actually have real content to act on.
import { query } from '../lib/db.mjs';

// subject_question_count is computed in its own subquery, summed once per
// chapter, before the chapter/topic join fans out — joining chapter then
// topic directly and summing chapter.question_count would multiply each
// chapter's count by how many topics it has, which is wrong.
export async function findSubjectAggregates(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT s.id, s.name, sq.subject_question_count,
            COALESCE(SUM(lts.attempt_count), 0)::int AS attempt_count,
            CASE WHEN SUM(lts.attempt_count) > 0
                 THEN SUM(lts.accuracy_score * lts.attempt_count) / SUM(lts.attempt_count)
                 ELSE 0 END::float8 AS weighted_accuracy,
            MAX(lts.last_studied_at) AS last_studied_at
       FROM subject s
       JOIN (SELECT subject_id, SUM(question_count)::int AS subject_question_count
               FROM chapter GROUP BY subject_id) sq ON sq.subject_id = s.id
       JOIN chapter c ON c.subject_id = s.id
       JOIN topic t ON t.chapter_id = c.id
       LEFT JOIN learner_topic_state lts ON lts.topic_id = t.id AND lts.learner_id = $1
      GROUP BY s.id, s.name, sq.subject_question_count`,
    [learnerId]
  );
  return result.rows;
}

export async function findContentTopicIdsForSubject(subjectId, client = { query }) {
  const result = await client.query(
    `SELECT DISTINCT t.id
       FROM topic t JOIN chapter c ON c.id = t.chapter_id
       JOIN question q ON q.topic_id = t.id
      WHERE c.subject_id = $1 AND q.status = 'PUBLISHED'`,
    [subjectId]
  );
  return result.rows.map((r) => r.id);
}
