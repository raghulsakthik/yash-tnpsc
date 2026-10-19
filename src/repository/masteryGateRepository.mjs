// Phase 13 — the one new read the Mastery Gate needs: the most recent
// completed assessment that actually said something about this topic.
// Reads the diagnostic Phase 3/4 already computed and stored in
// assessment.metadata; nothing here reclassifies anything.
import { query } from '../lib/db.mjs';

export async function findLatestAssessmentPerformanceForTopic(learnerId, topicId, client = { query }) {
  const result = await client.query(
    `SELECT metadata->'diagnostic' AS diagnostic, completed_at
       FROM assessment
      WHERE learner_id = $1 AND status = 'COMPLETED' AND metadata ? 'diagnostic'
      ORDER BY completed_at DESC`,
    [learnerId]
  );

  for (const row of result.rows) {
    const classifications = row.diagnostic?.classifications ?? [];
    const match = classifications.find((c) => c.topicId === topicId);
    if (match) {
      return { classification: match.classification, completedAt: row.completed_at };
    }
  }
  return null;
}
