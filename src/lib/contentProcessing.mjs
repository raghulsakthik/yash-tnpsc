import { query, pool } from './db.mjs';
import { getSyllabusTree } from './adminContent.mjs';
import { extractText } from './documentExtract.mjs';
import { renderPdfDiagramToPng } from './pdfRender.mjs';
import { classifyContent } from './ai/contentClassifier.mjs';
import { putObject, getObject, deleteObject, contentObjectKey, isObjectStorageConfigured } from './objectStorage.mjs';

export class ContentProcessingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const clampProgress = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

async function updateJob(jobId, patch) {
  const fields = [];
  const values = [];
  let n = 1;
  for (const [key, value] of Object.entries(patch)) {
    fields.push(`${key} = $${n++}`);
    values.push(value);
  }
  fields.push(`updated_at = now()`);
  values.push(jobId);
  await query(`UPDATE content_processing_job SET ${fields.join(', ')} WHERE id = $${n}`, values);
}

async function updateBatch(batchId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
            COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed,
            COUNT(*) FILTER (WHERE status IN ('PROCESSING'))::int AS processing
       FROM content_processing_job WHERE batch_id = $1`,
    [batchId]
  );
  const row = rows[0];
  const status = row.failed > 0 && row.completed + row.failed === row.total
    ? (row.completed > 0 ? 'COMPLETED' : 'FAILED')
    : row.completed + row.failed === row.total ? 'COMPLETED'
    : row.processing > 0 ? 'PROCESSING' : 'QUEUED';
  await query(
    `UPDATE content_processing_batch SET status = $2, updated_at = now(), completed_at = CASE WHEN $2 IN ('COMPLETED','FAILED') THEN now() ELSE completed_at END WHERE id = $1`,
    [batchId, status]
  );
}

export async function createProcessingBatch({ adminId, files }) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new ContentProcessingError('NO_FILES', 'At least one file is required.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: batches } = await client.query(
      `INSERT INTO content_processing_batch (created_by, file_count, status) VALUES ($1, $2, 'QUEUED') RETURNING id`,
      [adminId, files.length]
    );
    const batchId = batches[0].id;
    for (const file of files) {
      let stored = null;
      let sourceObjectKey = null;
      let sourceData = null;
      if (isObjectStorageConfigured()) {
        const objectKey = contentObjectKey(batchId, file.fileName);
        stored = await putObject(objectKey, file.data, file.mimeType ?? 'application/octet-stream');
        sourceObjectKey = stored.key;
      } else {
        // Local/self-hosted mode keeps the immutable upload in PostgreSQL until processing finishes.
        sourceData = file.data;
        stored = { size: file.data.length, sha256: crypto.createHash('sha256').update(file.data).digest('hex') };
      }
      await client.query(
        `INSERT INTO content_processing_job
          (batch_id, file_name, source_year, exam_code, exam_group, paper, mime_type, source_data, source_object_key, source_size_bytes, source_sha256, created_by, status, stage, progress)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'QUEUED', 'QUEUED', 0)`,
        [batchId, file.fileName, file.sourceYear ?? null, file.examCode ?? null, file.examGroup ?? null, file.paper ?? null, file.mimeType ?? null, sourceData, sourceObjectKey, stored.size, stored.sha256, adminId]
      );
    }
    await client.query('COMMIT');
    return batchId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function processJob(jobId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, batch_id, file_name, source_year, exam_code, exam_group, paper, mime_type, source_data, source_object_key, status
         FROM content_processing_job WHERE id = $1 FOR UPDATE`,
      [jobId]
    );
    if (!rows.length) throw new ContentProcessingError('JOB_NOT_FOUND', `No processing job ${jobId}`);
    const job = rows[0];
    if (job.status === 'COMPLETED') return;
    await client.query(
      `UPDATE content_processing_job SET status = 'PROCESSING', stage = 'EXTRACTING', progress = 5, started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1`,
      [jobId]
    );
    await client.query(`UPDATE content_processing_batch SET status = 'PROCESSING', updated_at = now() WHERE id = $1`, [job.batch_id]);
    await client.query('COMMIT');

    const buffer = job.source_object_key ? await getObject(job.source_object_key) : job.source_data;
    if (!buffer || buffer.length === 0) throw new ContentProcessingError('EMPTY_FILE', 'The stored upload is empty.');

    const { pages, isPdf } = await extractText(buffer, job.file_name);
    await updateJob(jobId, { stage: 'CLASSIFYING', progress: 35 });

    const syllabusTree = await getSyllabusTree();
    const result = await classifyContent(pages, syllabusTree);
    await updateJob(jobId, { stage: 'VALIDATING', progress: 70 });

    if (isPdf) {
      for (const item of [...(result.mcqs ?? []), ...(result.resources ?? [])]) {
        if (!item.needsDiagram || !item.sourcePage) continue;
        const png = await renderPdfDiagramToPng(buffer, item.sourcePage, item.question ?? item.title);
        item.diagramImage = png ? `data:image/png;base64,${png.toString('base64')}` : null;
      }
    }

    await updateJob(jobId, {
      status: 'COMPLETED',
      stage: 'READY_FOR_REVIEW',
      progress: 100,
      result: JSON.stringify({
        fileName: job.file_name,
        sourceYear: job.source_year,
        examCode: job.exam_code,
        examGroup: job.exam_group,
        paper: job.paper,
        ...result,
      }),
      completed_at: new Date(),
    });
    await query(`UPDATE content_processing_job SET source_data = NULL WHERE id = $1`, [jobId]);
    if (job.source_object_key) { try { await deleteObject(job.source_object_key); } catch {} }
    await updateBatch(job.batch_id);
  } catch (err) {
    const message = err?.message ?? 'Processing failed';
    try {
      await updateJob(jobId, { status: 'FAILED', stage: 'FAILED', progress: 100, error: message, completed_at: new Date() });
      const { rows } = await query(`SELECT batch_id FROM content_processing_job WHERE id = $1`, [jobId]);
      if (rows[0]) await updateBatch(rows[0].batch_id);
    } catch {}
    throw err;
  }
}

export async function claimNextProcessingJob() {
  const { rows } = await query(`
    UPDATE content_processing_job
       SET status = 'PROCESSING', stage = 'EXTRACTING', started_at = COALESCE(started_at, now()), updated_at = now()
     WHERE id = (
       SELECT id FROM content_processing_job
        WHERE status = 'QUEUED'
           OR (status = 'PROCESSING' AND updated_at < now() - interval '10 minutes')
        ORDER BY CASE WHEN status = 'PROCESSING' THEN 0 ELSE 1 END, created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
     )
     RETURNING id`, []);
  return rows[0]?.id ?? null;
}

export async function processBatch(batchId) {
  const { rows } = await query(
    `SELECT id FROM content_processing_job WHERE batch_id = $1 AND status IN ('QUEUED','PROCESSING') ORDER BY created_at`,
    [batchId]
  );
  for (const row of rows) {
    try { await processJob(row.id); } catch {}
  }
  await updateBatch(batchId);
}

export async function getProcessingBatch(batchId, adminId) {
  const { rows: batches } = await query(
    `SELECT id, file_count, status, created_at, updated_at, completed_at FROM content_processing_batch WHERE id = $1 AND created_by = $2`,
    [batchId, adminId]
  );
  if (!batches.length) return null;
  const { rows: jobs } = await query(
    `SELECT id, file_name, source_year, exam_code, exam_group, paper, mime_type, status, stage, progress, result, error, created_at, updated_at, started_at, completed_at
       FROM content_processing_job WHERE batch_id = $1 ORDER BY created_at`,
    [batchId]
  );
  return { ...batches[0], jobs };
}

export async function listProcessingBatches(adminId, limit = 20) {
  const { rows } = await query(
    `SELECT b.id, b.file_count, b.status, b.created_at, b.updated_at, b.completed_at,
            COUNT(j.id)::int AS jobs,
            COUNT(j.id) FILTER (WHERE j.status = 'COMPLETED')::int AS completed,
            COUNT(j.id) FILTER (WHERE j.status = 'FAILED')::int AS failed,
            COALESCE(ROUND(AVG(j.progress)), 0)::int AS progress
       FROM content_processing_batch b
       LEFT JOIN content_processing_job j ON j.batch_id = b.id
      WHERE b.created_by = $1
      GROUP BY b.id
      ORDER BY b.created_at DESC LIMIT $2`,
    [adminId, limit]
  );
  return rows;
}
