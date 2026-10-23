// Phase 7 — the one query the Foundation Learning Engine needed that
// nothing else provides: every candidate topic's current state, defaulting
// an untouched topic to zero evidence rather than omitting it. A brand new
// learner must still get a full candidate list to choose from, not just the
// topics she happens to already have a learner_topic_state row for.
import { query } from '../lib/db.mjs';

export async function findCandidateTopicStates(learnerId, topicIds, client = { query }) {
  if (topicIds.length === 0) return [];
  const result = await client.query(
    `SELECT t.id, t.name, t.chapter_id, c.question_count AS chapter_question_count,
            (SELECT COUNT(*)::int FROM topic t2 WHERE t2.chapter_id = t.chapter_id) AS topic_count,
            COALESCE(s.accuracy_score::float8, 0) AS accuracy,
            COALESCE(s.attempt_count, 0) AS attempt_count,
            COALESCE(s.current_difficulty::float8, 0.3) AS current_difficulty
       FROM topic t
       JOIN chapter c ON c.id = t.chapter_id
       LEFT JOIN learner_topic_state s ON s.topic_id = t.id AND s.learner_id = $1
      WHERE t.id = ANY($2)`,
    [learnerId, topicIds]
  );
  return result.rows;
}
