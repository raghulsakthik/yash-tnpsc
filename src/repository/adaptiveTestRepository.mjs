// Phase 27.1/27.2 — the two real reads the Adaptive Test Blueprint and
// Question Selection Engine need that nothing else already exposes.
// Everything else (foundation topics, weak-area classification, due
// revision, PYQ questions, inspired questions, per-topic digital-twin
// signals) is reused from Phases 3/4/6/11/26, unchanged.
import { query } from '../lib/db.mjs';

// NEW_CONCEPTS candidates: real, published-question-bearing topics she has
// never touched at all (no learner_topic_state row), outside whatever
// topics another category already covers.
export async function findUntouchedTopicsWithQuestions(learnerId, excludeTopicIds, client = { query }) {
  const result = await client.query(
    `SELECT DISTINCT t.id AS topic_id
       FROM topic t
       JOIN question q ON q.topic_id = t.id AND q.status = 'PUBLISHED'
      WHERE NOT EXISTS (
              SELECT 1 FROM learner_topic_state s WHERE s.learner_id = $1 AND s.topic_id = t.id
            )
        AND NOT (t.id = ANY($2))`,
    [learnerId, excludeTopicIds]
  );
  return result.rows.map((r) => r.topic_id);
}

// Batch seenCount/attemptsSinceLastSeen for an arbitrary set of candidate
// question ids — the same real signal findPyqCandidatesForTopic (Phase 21)
// already computes per-topic, generalized here across a mixed-category set.
export async function findQuestionAttemptStats(learnerId, questionIds, client = { query }) {
  if (questionIds.length === 0) return new Map();
  const result = await client.query(
    `SELECT q.id,
            COUNT(a.id)::int AS seen_count,
            COALESCE(
              (SELECT COUNT(*) FROM question_attempt a2
                WHERE a2.learner_id = $1
                  AND a2.created_at > MAX(a.created_at)), 999
            )::int AS attempts_since_last_seen
       FROM question q
       LEFT JOIN question_attempt a ON a.question_id = q.id AND a.learner_id = $1
      WHERE q.id = ANY($2)
      GROUP BY q.id`,
    [learnerId, questionIds]
  );
  return new Map(result.rows.map((r) => [r.id, { seenCount: r.seen_count, attemptsSinceLastSeen: r.attempts_since_last_seen }]));
}

// 27.4's retention-problem comparison needs one real prior completed test
// (any type) with a stored diagnostic to compare against — the most recent
// one before this test, never a fabricated baseline.
export async function findLatestOtherCompletedAssessmentDiagnostic(learnerId, excludeAssessmentId, client = { query }) {
  const result = await client.query(
    `SELECT metadata FROM assessment
      WHERE learner_id = $1 AND id != $2 AND status = 'COMPLETED' AND metadata ? 'diagnostic'
      ORDER BY completed_at DESC LIMIT 1`,
    [learnerId, excludeAssessmentId]
  );
  return result.rows[0]?.metadata?.diagnostic ?? null;
}
