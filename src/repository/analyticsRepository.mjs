// Phase 28.1/28.2 — every real aggregate the Analytics Engine needs.
// Reads only; nothing here is persisted besides the readiness snapshot
// (examReadinessRepository.mjs). Every query is scoped to one learner.
import { query } from '../lib/db.mjs';

// Unified, real test-score history: the generic `assessment` table
// (DEFAULT_TEST/ADAPTIVE_TEST/MINI_ASSESSMENT, Phase 2/3/27) plus the
// original weekly `test` table (Phase 1) — both real sources of a
// completed, scored test, oldest first.
export async function findTestHistory(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT id, type, score::float8 AS score, completed_at
       FROM assessment
      WHERE learner_id = $1 AND status = 'COMPLETED' AND score IS NOT NULL
      UNION ALL
      SELECT id, 'WEEKLY_TEST' AS type, score::float8 AS score, completed_at
       FROM test
      WHERE learner_id = $1 AND status = 'COMPLETED' AND score IS NOT NULL
      ORDER BY completed_at ASC`,
    [learnerId]
  );
  return result.rows;
}

export async function findTestCompletionCounts(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM assessment WHERE learner_id = $1 AND status = 'COMPLETED') +
       (SELECT COUNT(*)::int FROM test WHERE learner_id = $1 AND status = 'COMPLETED') AS completed,
       (SELECT COUNT(*)::int FROM assessment WHERE learner_id = $1) +
       (SELECT COUNT(*)::int FROM test WHERE learner_id = $1) AS started`,
    [learnerId]
  );
  return result.rows[0];
}

export async function findSubjectMastery(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT s.id AS subject_id, s.name AS subject_name, AVG(ls.mastery_score)::float8 AS average_mastery
       FROM learner_topic_state ls
       JOIN topic t ON t.id = ls.topic_id
       JOIN chapter c ON c.id = t.chapter_id
       JOIN subject s ON s.id = c.subject_id
      WHERE ls.learner_id = $1 AND ls.attempt_count > 0
      GROUP BY s.id, s.name`,
    [learnerId]
  );
  return result.rows;
}

export async function findTouchedTopicSpeedAccuracy(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT ls.topic_id, t.name AS topic_name, ls.speed_score::float8 AS speed, ls.accuracy_score::float8 AS accuracy
       FROM learner_topic_state ls JOIN topic t ON t.id = ls.topic_id
      WHERE ls.learner_id = $1 AND ls.attempt_count > 0`,
    [learnerId]
  );
  return result.rows;
}

export async function findStudyTimeAndCounts(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT COALESCE(SUM(time_taken_ms), 0)::float8 AS study_time_ms, COUNT(*)::int AS questions_solved,
            COUNT(*) FILTER (WHERE created_at > now() - interval '14 days')::int AS recent_count
       FROM question_attempt WHERE learner_id = $1`,
    [learnerId]
  );
  return result.rows[0];
}

export async function findAverageConsistency(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT AVG(consistency_score)::float8 AS average_consistency
       FROM learner_topic_state WHERE learner_id = $1 AND attempt_count > 0`,
    [learnerId]
  );
  return result.rows[0]?.average_consistency ?? null;
}

// Real evidence of at least one successful review cycle: interval_days
// advanced past its real starting value of 1 (recordAttempt()'s own real
// REVISION-mode update, revision.mjs, unchanged) — never the unused
// 'DONE' status, which nothing in this codebase ever actually sets.
export async function findRevisionCompletionStats(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT COUNT(*) FILTER (WHERE interval_days > 1)::int AS advanced, COUNT(*)::int AS total
       FROM revision_schedule WHERE learner_id = $1`,
    [learnerId]
  );
  return result.rows[0];
}

export async function findPyqYearlyAccuracy(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT q.source_year AS year, COUNT(*)::int AS attempts, COUNT(*) FILTER (WHERE a.correct)::int AS correct
       FROM question_attempt a JOIN question q ON q.id = a.question_id
      WHERE a.learner_id = $1 AND q.source LIKE 'tnpsc-%' AND q.source_year IS NOT NULL
      GROUP BY q.source_year ORDER BY q.source_year`,
    [learnerId]
  );
  return result.rows;
}

export async function findPyqSubjectAccuracy(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT s.id AS subject_id, s.name AS subject_name, COUNT(*)::int AS attempts, COUNT(*) FILTER (WHERE a.correct)::int AS correct
       FROM question_attempt a
       JOIN question q ON q.id = a.question_id
       JOIN topic t ON t.id = q.topic_id
       JOIN chapter c ON c.id = t.chapter_id
       JOIN subject s ON s.id = c.subject_id
      WHERE a.learner_id = $1 AND q.source LIKE 'tnpsc-%'
      GROUP BY s.id, s.name`,
    [learnerId]
  );
  return result.rows;
}

export async function findPyqTopicAccuracy(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT t.id AS topic_id, t.name AS topic_name, COUNT(*)::int AS attempts, COUNT(*) FILTER (WHERE a.correct)::int AS correct
       FROM question_attempt a JOIN question q ON q.id = a.question_id JOIN topic t ON t.id = q.topic_id
      WHERE a.learner_id = $1 AND q.source LIKE 'tnpsc-%'
      GROUP BY t.id, t.name`,
    [learnerId]
  );
  return result.rows;
}

// Real chronological halves of her PYQ attempt history — "early" vs
// "recent" without assuming any particular real calendar window exists.
export async function findPyqEarlyVsRecentAccuracy(learnerId, client = { query }) {
  const result = await client.query(
    `WITH ordered AS (
       SELECT a.correct, ROW_NUMBER() OVER (ORDER BY a.created_at ASC) AS rn, COUNT(*) OVER () AS total
         FROM question_attempt a JOIN question q ON q.id = a.question_id
        WHERE a.learner_id = $1 AND q.source LIKE 'tnpsc-%'
     )
     SELECT
       COUNT(*) FILTER (WHERE rn <= total / 2)::int AS early_count,
       COUNT(*) FILTER (WHERE rn <= total / 2 AND correct)::int AS early_correct,
       COUNT(*) FILTER (WHERE rn > total / 2)::int AS recent_count,
       COUNT(*) FILTER (WHERE rn > total / 2 AND correct)::int AS recent_correct
     FROM ordered`,
    [learnerId]
  );
  return result.rows[0];
}

export async function findMistakeCountsEarlyVsRecent(learnerId, client = { query }) {
  const result = await client.query(
    `WITH ordered AS (
       SELECT mistake_type, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn, COUNT(*) OVER () AS total
         FROM question_attempt WHERE learner_id = $1 AND mistake_type IS NOT NULL
     )
     SELECT mistake_type, COUNT(*) FILTER (WHERE rn <= total / 2)::int AS early_count,
            COUNT(*) FILTER (WHERE rn > total / 2)::int AS recent_count
       FROM ordered GROUP BY mistake_type`,
    [learnerId]
  );
  return result.rows;
}

export async function findAverageTimeRatio(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT AVG(a.time_taken_ms::float8 / NULLIF(q.estimated_seconds, 0) / 1000.0)::float8 AS average_ratio
       FROM question_attempt a JOIN question q ON q.id = a.question_id
      WHERE a.learner_id = $1 AND a.time_taken_ms IS NOT NULL`,
    [learnerId]
  );
  return result.rows[0]?.average_ratio ?? null;
}

// Subject coverage: how many of the real subjects that have any real
// content at all has she touched at least one topic in.
export async function findSubjectCoverage(client = { query }) {
  const result = await client.query(
    `SELECT
       (SELECT COUNT(DISTINCT s.id) FROM subject s
          JOIN chapter c ON c.subject_id = s.id JOIN question q ON q.topic_id IN (SELECT id FROM topic WHERE chapter_id = c.id)
          WHERE q.status = 'PUBLISHED')::int AS subjects_with_content`
  );
  return result.rows[0].subjects_with_content;
}

export async function findTouchedSubjectCount(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT COUNT(DISTINCT s.id)::int AS n
       FROM learner_topic_state ls
       JOIN topic t ON t.id = ls.topic_id
       JOIN chapter c ON c.id = t.chapter_id
       JOIN subject s ON s.id = c.subject_id
      WHERE ls.learner_id = $1 AND ls.attempt_count > 0`,
    [learnerId]
  );
  return result.rows[0].n;
}

export async function findAverageMastery(learnerId, client = { query }) {
  const result = await client.query(
    `SELECT AVG(mastery_score)::float8 AS avg_mastery, AVG(retention_score)::float8 AS avg_retention,
            AVG(speed_score)::float8 AS avg_speed, AVG(confidence_score)::float8 AS avg_confidence
       FROM learner_topic_state WHERE learner_id = $1 AND attempt_count > 0`,
    [learnerId]
  );
  return result.rows[0];
}
