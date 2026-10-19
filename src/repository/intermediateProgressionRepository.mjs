// Phase 18 — the two reads the Intermediate Progression Engine needs that
// nothing else exposes. Mirrors the exact foundation-candidate CTE already
// established in defaultAssessmentRepository.mjs (Phase 3) — consistent,
// not a reinvention of that query.
import { query } from '../lib/db.mjs';

export async function findFoundationTopics(client = { query }) {
  const result = await client.query(`SELECT id, name FROM topic WHERE chapter_id = 'apt.foundation'`);
  return result.rows;
}

// Every topic with real PUBLISHED content that is NOT already part of the
// Default Foundation Test's candidate set (foundation + its direct
// dependents, Phase 3) — the next layer up, derived from the real
// prerequisite graph and real content, not a hardcoded topic list.
export async function findIntermediateCandidateTopics(client = { query }) {
  const result = await client.query(
    `WITH foundation AS (
       SELECT t.id FROM topic t WHERE t.chapter_id = 'apt.foundation'
     ),
     dependents AS (
       SELECT DISTINCT tp.topic_id AS id
       FROM topic_prerequisite tp
       WHERE tp.prerequisite_topic_id IN (SELECT id FROM foundation)
     ),
     foundation_candidates AS (
       SELECT id FROM foundation UNION SELECT id FROM dependents
     )
     SELECT DISTINCT t.id, t.name
       FROM topic t JOIN question q ON q.topic_id = t.id
      WHERE q.status = 'PUBLISHED' AND t.id NOT IN (SELECT id FROM foundation_candidates)`
  );
  return result.rows;
}
