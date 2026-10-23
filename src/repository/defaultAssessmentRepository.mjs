// Phase 3 — queries specific to the Default Foundation Test: candidate
// topic discovery, exposure evidence, question pools, and the
// assessment_question/assessment_answer tables added in V7.
import { query } from '../lib/db.mjs';

// Foundation topics plus the first layer of topics that directly depend on
// one — derived from the seeded `topic_prerequisite` graph rather than a
// hardcoded topic-id list, so this stays correct if the syllabus changes.
export async function findDefaultAssessmentCandidateTopics(client = { query }) {
  const result = await client.query(
    `WITH foundation AS (
       SELECT t.id FROM topic t WHERE t.chapter_id = 'apt.foundation'
     ),
     dependents AS (
       SELECT DISTINCT tp.topic_id AS id
       FROM topic_prerequisite tp
       WHERE tp.prerequisite_topic_id IN (SELECT id FROM foundation)
     )
     SELECT t.id, t.name, t.chapter_id
       FROM topic t
      WHERE t.id IN (SELECT id FROM foundation UNION SELECT id FROM dependents)`
  );
  return result.rows;
}

// Phase 5 — the real curriculum order for a set of topics: chapter sort_order
// first (so apt.foundation always precedes apt.aptitude), then topic
// sort_order within the chapter. Both columns have existed since V1 but
// nothing read them until the learning path needed a sequence to walk.
export async function findTopicsInSyllabusOrder(topicIds, client = { query }) {
  if (topicIds.length === 0) return [];
  const result = await client.query(
    `SELECT t.id
       FROM topic t JOIN chapter c ON c.id = t.chapter_id
      WHERE t.id = ANY($1)
      ORDER BY c.sort_order, t.sort_order`,
    [topicIds]
  );
  return result.rows.map((r) => r.id);
}

// A topic counts as "exposed" if the learner has either completed a LESSON
// session on it, or already has at least one practice attempt recorded —
// the latter is a fallback for right now, while lesson content is still
// sparse (see docs/phase-3-completion.md known limitations).
export async function findExposedTopicIds(learnerId, topicIds, client = { query }) {
  if (topicIds.length === 0) return [];
  const result = await client.query(
    `SELECT DISTINCT topic_id FROM (
       SELECT topic_id FROM learner_topic_state
        WHERE learner_id = $1 AND topic_id = ANY($2) AND attempt_count >= 1
       UNION
       SELECT topic_id FROM learning_session
        WHERE learner_id = $1 AND topic_id = ANY($2)
          AND session_type = 'LESSON' AND status = 'COMPLETED'
     ) exposed`,
    [learnerId, topicIds]
  );
  return result.rows.map((r) => r.topic_id);
}

export async function findPublishedQuestionsForTopics(topicIds, client = { query }) {
  if (topicIds.length === 0) return [];
  const result = await client.query(
    `SELECT id, topic_id, difficulty::float8 AS difficulty, prompt, options,
            answer_index, explanation, trap, estimated_seconds, source
       FROM question WHERE topic_id = ANY($1) AND status = 'PUBLISHED'`,
    [topicIds]
  );
  return result.rows;
}

export async function findSeenQuestionIds(learnerId, client = { query }) {
  const result = await client.query('SELECT DISTINCT question_id FROM question_attempt WHERE learner_id = $1', [
    learnerId,
  ]);
  return result.rows.map((r) => r.question_id);
}

export async function findInProgressDefaultAssessment(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT id FROM assessment
      WHERE learner_id = $1 AND type = 'DEFAULT_TEST' AND status = 'IN_PROGRESS'
      ORDER BY created_at DESC LIMIT 1`,
    [learnerId]
  );
  return result.rows[0] ?? null;
}

export async function insertAssessmentQuestions(assessmentId, orderedQuestionIds, client = { query }) {
  for (const [index, questionId] of orderedQuestionIds.entries()) {
    await client.query(
      'INSERT INTO assessment_question (assessment_id, question_id, order_index) VALUES ($1, $2, $3)',
      [assessmentId, questionId, index]
    );
  }
}

export async function findAssessmentQuestions(assessmentId, client = { query }) {
  const result = await client.query(
    `SELECT aq.order_index, q.id AS question_id, q.topic_id, t.name AS topic_name,
            q.prompt, q.options, q.difficulty::float8 AS difficulty, q.estimated_seconds,
            q.answer_index, q.explanation, q.trap
       FROM assessment_question aq
       JOIN question q ON q.id = aq.question_id
       JOIN topic t ON t.id = q.topic_id
      WHERE aq.assessment_id = $1
      ORDER BY aq.order_index`,
    [assessmentId]
  );
  return result.rows;
}

export async function upsertAssessmentAnswer(
  { assessmentId, questionId, selectedIndex, timeTakenMs, confidence },
  client = { query }
) {
  await client.query(
    `INSERT INTO assessment_answer (assessment_id, question_id, selected_index, time_taken_ms, confidence, answered_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (assessment_id, question_id) DO UPDATE SET
       selected_index = EXCLUDED.selected_index,
       time_taken_ms  = EXCLUDED.time_taken_ms,
       confidence     = EXCLUDED.confidence,
       answered_at    = now()`,
    [assessmentId, questionId, selectedIndex, timeTakenMs, confidence]
  );
}

export async function findAssessmentAnswers(assessmentId, client = { query }) {
  const result = await client.query(
    'SELECT question_id, selected_index, time_taken_ms, confidence FROM assessment_answer WHERE assessment_id = $1',
    [assessmentId]
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

// Phase 10 — retention is tracked independently of any one assessment, by
// the spaced-repetition pipeline (revision.mjs, via recordAttempt()). The
// diagnostic engine reads it, never recomputes it.
export async function findRetentionForTopics(learnerId, topicIds, client = { query }) {
  if (topicIds.length === 0) return [];
  const result = await client.query(
    `SELECT topic_id, retention_score::float8 AS retention
       FROM learner_topic_state WHERE learner_id = $1 AND topic_id = ANY($2)`,
    [learnerId, topicIds]
  );
  return result.rows;
}
