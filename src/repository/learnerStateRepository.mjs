// Phase 6 — read-only queries backing the Learner Digital Twin. No new
// schema: every column read here already exists (learner_topic_state since
// V1/V2, question_attempt since V1, topic_prerequisite since V1).
import { query } from '../lib/db.mjs';

export async function findTopicStateRow(learnerId, topicId, client = { query }) {
  const result = await client.query(
    `SELECT mastery_score::float8 AS mastery, accuracy_score::float8 AS accuracy,
            concept_score::float8 AS concept, speed_score::float8 AS speed,
            retention_score::float8 AS retention, confidence_score::float8 AS confidence,
            consistency_score::float8 AS consistency, attempt_count, correct_count,
            current_difficulty::float8 AS difficulty, next_action, last_studied_at
       FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, topicId]
  );
  return result.rows[0] ?? null;
}

export async function findRecentAttemptsForTopic(learnerId, topicId, limit = 20, client = { query }) {
  const result = await client.query(
    `SELECT a.correct, a.time_taken_ms AS "timeTakenMs", a.confidence, a.mistake_type AS "mistakeType", a.created_at
       FROM question_attempt a
      WHERE a.learner_id = $1 AND a.topic_id = $2
      ORDER BY a.created_at DESC
      LIMIT $3`,
    [learnerId, topicId, limit]
  );
  return result.rows;
}

// Every topic the learner has touched at all (attempt_count >= 1), with
// enough curriculum context to classify and recommend across all of them —
// the live, current-state counterpart to one past assessment's snapshot.
export async function findAllTouchedTopicStates(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT t.id AS topic_id, t.name AS topic_name, s.mastery_score::float8 AS mastery,
            s.accuracy_score::float8 AS accuracy, s.attempt_count
       FROM learner_topic_state s JOIN topic t ON t.id = s.topic_id
      WHERE s.learner_id = $1 AND s.attempt_count >= 1`,
    [learnerId]
  );
  return result.rows;
}

export async function findPrerequisiteGraphForTopics(topicIds, client = { query }) {
  if (topicIds.length === 0) return [];
  const result = await client.query(
    `SELECT topic_id, prerequisite_topic_id, strength::float8 AS strength
       FROM topic_prerequisite WHERE topic_id = ANY($1)`,
    [topicIds]
  );
  return result.rows;
}

// Accuracy for an arbitrary set of topics (e.g. a topic's direct
// prerequisites), defaulting unattempted ones to 0 — same convention
// weakestPrerequisite() already uses for an unattempted prerequisite.
export async function findAccuracyForTopics(learnerId, topicIds, client = { query }) {
  if (topicIds.length === 0) return [];
  const result = await client.query(
    `SELECT topic_id, accuracy_score::float8 AS accuracy
       FROM learner_topic_state WHERE learner_id = $1 AND topic_id = ANY($2)`,
    [learnerId, topicIds]
  );
  return result.rows;
}
