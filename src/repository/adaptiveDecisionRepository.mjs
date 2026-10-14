// Phase 11 — the one piece of evidence nothing else exposes: whether a
// topic's spaced-repetition schedule is due right now. revision_schedule
// itself has existed since V3; this is just a read of it.
import { query } from '../lib/db.mjs';

export async function isRevisionDue(learnerId, topicId, client = { query }) {
  const result = await client.query(
    `SELECT 1 FROM revision_schedule
      WHERE learner_id = $1 AND topic_id = $2 AND status = 'SCHEDULED' AND scheduled_at <= now()`,
    [learnerId, topicId]
  );
  return result.rowCount > 0;
}
