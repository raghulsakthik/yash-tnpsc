// Phase 2 — repository for the new generic `assessment` table (V6). Minimal
// on purpose: the blueprint engine, question selection, and scoring for
// assessments are Phase 9/10 work. This only establishes create/read so the
// entity exists and can be exercised end to end.
import { query } from '../lib/db.mjs';

export async function createAssessment({ learnerId = null, type, status = 'DRAFT', metadata = {} }, client = { query }) {
  const result = await client.query(
    `INSERT INTO assessment (learner_id, type, status, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING id, learner_id, type, status, metadata, created_at, updated_at`,
    [learnerId, type, status, metadata]
  );
  return result.rows[0];
}

export async function findAssessmentById(id, client = { query }) {
  const result = await client.query(
    'SELECT id, learner_id, type, status, metadata, created_at, updated_at FROM assessment WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}
