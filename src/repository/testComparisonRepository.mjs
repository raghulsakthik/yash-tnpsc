// Phase 15 — reads the diagnostic Phase 3/4/10 already compute and store
// in assessment.metadata on every submission. Nothing here recomputes a
// diagnosis; it only finds which two completed assessments to compare.
import { query } from '../lib/db.mjs';

export async function findRecentCompletedAssessments(learnerId, limit, client = { query }) {
  const result = await client.query(
    `SELECT id, type, completed_at, metadata->'diagnostic' AS diagnostic
       FROM assessment
      WHERE learner_id = $1 AND status = 'COMPLETED' AND metadata ? 'diagnostic'
      ORDER BY completed_at DESC
      LIMIT $2`,
    [learnerId, limit]
  );
  return result.rows;
}

export async function findRecentCompletedAssessmentsForTopic(learnerId, topicId, limit, client = { query }) {
  const result = await client.query(
    `SELECT id, type, completed_at, metadata->'diagnostic' AS diagnostic
       FROM assessment
      WHERE learner_id = $1 AND status = 'COMPLETED' AND metadata ? 'diagnostic'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(metadata->'diagnostic'->'topics') t
           WHERE t->>'topicId' = $2
        )
      ORDER BY completed_at DESC
      LIMIT $3`,
    [learnerId, topicId, limit]
  );
  return result.rows;
}
