import { query, pool } from './db.mjs';

export class ContentReviewError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Every batch awaiting a decision, newest first, with its questions inlined for review. */
export async function listPendingBatches() {
  const { rows: batches } = await query(
    `SELECT b.id, b.topic_id, t.name AS topic_name, b.generation_source, b.question_ids,
            b.avg_quality_score::float8 AS avg_quality_score, b.created_at
       FROM content_review_batch b
       JOIN topic t ON t.id = b.topic_id
      WHERE b.status = 'PENDING'
      ORDER BY b.created_at DESC`
  );

  const out = [];
  for (const b of batches) {
    const ids = b.question_ids;
    const { rows: questions } = await query(
      `SELECT id, prompt, options, answer_index, explanation, shortcut, common_mistake,
              difficulty::float8 AS difficulty, quality_score::float8 AS quality_score
         FROM question WHERE id = ANY($1::text[])`,
      [ids]
    );
    out.push({
      id: b.id,
      topicId: b.topic_id,
      topicName: b.topic_name,
      generationSource: b.generation_source,
      avgQualityScore: b.avg_quality_score,
      createdAt: b.created_at,
      questions,
    });
  }
  return out;
}

/** Approves a batch: every linked question moves DRAFT -> PUBLISHED and becomes servable. */
export async function approveBatch(batchId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT question_ids, status FROM content_review_batch WHERE id = $1 FOR UPDATE`,
      [batchId]
    );
    if (rows.length === 0) throw new ContentReviewError('BATCH_NOT_FOUND', `No review batch ${batchId}`);
    if (rows[0].status !== 'PENDING') throw new ContentReviewError('ALREADY_DECIDED', `Batch already ${rows[0].status}`);

    await client.query(
      `UPDATE question SET status = 'PUBLISHED', updated_at = now() WHERE id = ANY($1::text[])`,
      [rows[0].question_ids]
    );
    await client.query(
      `UPDATE content_review_batch SET status = 'APPROVED', reviewed_at = now() WHERE id = $1`,
      [batchId]
    );
    await client.query('COMMIT');
    return { approved: rows[0].question_ids.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Rejects a batch: every linked question is archived (kept for audit, never served). */
export async function rejectBatch(batchId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT question_ids, status FROM content_review_batch WHERE id = $1 FOR UPDATE`,
      [batchId]
    );
    if (rows.length === 0) throw new ContentReviewError('BATCH_NOT_FOUND', `No review batch ${batchId}`);
    if (rows[0].status !== 'PENDING') throw new ContentReviewError('ALREADY_DECIDED', `Batch already ${rows[0].status}`);

    await client.query(
      `UPDATE question SET status = 'ARCHIVED', updated_at = now() WHERE id = ANY($1::text[])`,
      [rows[0].question_ids]
    );
    await client.query(
      `UPDATE content_review_batch SET status = 'REJECTED', reviewed_at = now() WHERE id = $1`,
      [batchId]
    );
    await client.query('COMMIT');
    return { rejected: rows[0].question_ids.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
