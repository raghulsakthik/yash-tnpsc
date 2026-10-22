import { query, pool } from './db.mjs';

export class ContentReviewError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Creates one PENDING review batch for a set of already-inserted (DRAFT)
 * questions, all belonging to one topic -- content_review_batch is
 * one-topic-per-row by design (mirrors how a template run always targets a
 * single topic), so a multi-topic source like one PDF commit creates one
 * batch per topic group instead of changing that shape.
 */
export async function createReviewBatch({ topicId, generationSource, questionIds = [], resourceIds = [], avgQualityScore = null }) {
  const { rows } = await query(
    `INSERT INTO content_review_batch (topic_id, generation_source, question_ids, avg_quality_score)
     VALUES ($1, $2, $3::jsonb, $4) RETURNING id`,
    [topicId, generationSource, JSON.stringify(questionIds), avgQualityScore]
  );
  const batchId = rows[0].id;
  await query(`UPDATE content_review_batch SET resource_ids = $2::jsonb WHERE id = $1`, [batchId, JSON.stringify(resourceIds)]);
  return batchId;
}

/** Every batch awaiting a decision, newest first, with its questions inlined for review. */
export async function listPendingBatches() {
  const { rows: batches } = await query(
    `SELECT b.id, b.topic_id, t.name AS topic_name, b.generation_source, b.question_ids, b.resource_ids,
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
              difficulty::float8 AS difficulty, quality_score::float8 AS quality_score,
              source, source_year, exam_code, exam_group, paper, question_number, source_page
         FROM question WHERE id = ANY($1::text[])`,
      [ids]
    );
    const resourceIds = Array.isArray(b.resource_ids) ? b.resource_ids : [];
    const { rows: resources } = await query(
      `SELECT id, title, body, source, status FROM topic_resource WHERE id = ANY($1::uuid[])`,
      [resourceIds]
    );
    out.push({
      id: b.id,
      topicId: b.topic_id,
      topicName: b.topic_name,
      generationSource: b.generation_source,
      avgQualityScore: b.avg_quality_score,
      createdAt: b.created_at,
      questions,
      resources,
    });
  }
  return out;
}

/** Approves a batch: every linked question moves DRAFT -> PUBLISHED and becomes servable. */
export async function approveBatch(batchId, reviewerId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT question_ids, resource_ids, status FROM content_review_batch WHERE id = $1 FOR UPDATE`,
      [batchId]
    );
    if (rows.length === 0) throw new ContentReviewError('BATCH_NOT_FOUND', `No review batch ${batchId}`);
    if (rows[0].status !== 'PENDING') throw new ContentReviewError('ALREADY_DECIDED', `Batch already ${rows[0].status}`);

    await client.query(
      `UPDATE question SET status = 'PUBLISHED', updated_at = now() WHERE id = ANY($1::text[])`,
      [rows[0].question_ids]
    );
    await client.query(
      `UPDATE topic_resource SET status = 'PUBLISHED', reviewed_at = now(), reviewed_by = $2 WHERE id = ANY($1::uuid[])`,
      [rows[0].resource_ids, reviewerId]
    );
    await client.query(
      `UPDATE content_review_batch SET status = 'APPROVED', reviewed_at = now(), reviewed_by = $2 WHERE id = $1`,
      [batchId, reviewerId]
    );
    await client.query('COMMIT');
    return { approved: rows[0].question_ids.length, resourcesApproved: rows[0].resource_ids.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Rejects a batch: every linked question is archived (kept for audit, never served). */
export async function rejectBatch(batchId, reviewerId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT question_ids, resource_ids, status FROM content_review_batch WHERE id = $1 FOR UPDATE`,
      [batchId]
    );
    if (rows.length === 0) throw new ContentReviewError('BATCH_NOT_FOUND', `No review batch ${batchId}`);
    if (rows[0].status !== 'PENDING') throw new ContentReviewError('ALREADY_DECIDED', `Batch already ${rows[0].status}`);

    await client.query(
      `UPDATE question SET status = 'ARCHIVED', updated_at = now() WHERE id = ANY($1::text[])`,
      [rows[0].question_ids]
    );
    await client.query(
      `UPDATE topic_resource SET status = 'ARCHIVED', reviewed_at = now(), reviewed_by = $2 WHERE id = ANY($1::uuid[])`,
      [rows[0].resource_ids, reviewerId]
    );
    await client.query(
      `UPDATE content_review_batch SET status = 'REJECTED', reviewed_at = now(), reviewed_by = $2 WHERE id = $1`,
      [batchId, reviewerId]
    );
    await client.query('COMMIT');
    return { rejected: rows[0].question_ids.length, resourcesRejected: rows[0].resource_ids.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
