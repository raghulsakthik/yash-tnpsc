// Repository for the generic `assessment` table. V6 (Phase 2) added the
// table itself; V7 (Phase 3) added question_count/score/completed_at once
// the Default Foundation Test needed somewhere to persist them — both
// migrations touch this one table, so this file selects every column it
// has rather than the subset one particular assessment type happens to use.
import { query } from '../lib/db.mjs';

const COLUMNS = 'id, learner_id, type, status, question_count, score, metadata, created_at, updated_at, completed_at';

export async function createAssessment({ learnerId = null, type, status = 'DRAFT', metadata = {} }, client = { query }) {
  const result = await client.query(
    `INSERT INTO assessment (learner_id, type, status, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [learnerId, type, status, metadata]
  );
  return result.rows[0];
}

export async function findAssessmentById(id, client = { query }) {
  const result = await client.query(`SELECT ${COLUMNS} FROM assessment WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}
