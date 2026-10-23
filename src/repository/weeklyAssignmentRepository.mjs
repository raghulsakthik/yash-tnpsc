// Phase 25 — the one new read the Weekly Assignment Engine needs: is there
// a real, active game (Phase 22's game_definition, unchanged table) that
// actually covers Friday's chosen topic? A plain read of game_definition,
// nothing new persisted.
import { query } from '../lib/db.mjs';

export async function findActiveGameDefinitionForTopic(topicId, client = { query }) {
  const result = await client.query(
    `SELECT id, name FROM game_definition WHERE status = 'ACTIVE' AND $1 = ANY(target_topic_ids) LIMIT 1`,
    [topicId]
  );
  return result.rows[0] ?? null;
}
