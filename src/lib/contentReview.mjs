import { query, pool } from './db.mjs';

export class ContentReviewError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export async function createReviewBatch({ topicId, generationSource, questionIds = [], resourceIds = [], lessonIds = [], avgQualityScore = null }) {
  const { rows } = await query(
    `INSERT INTO content_review_batch (topic_id, generation_source, question_ids, avg_quality_score, lesson_ids)
     VALUES ($1,$2,$3::jsonb,$4,$5::jsonb) RETURNING id`,
    [topicId, generationSource, JSON.stringify(questionIds), avgQualityScore, JSON.stringify(lessonIds)]
  );
  const batchId = rows[0].id;
  await query(`UPDATE content_review_batch SET resource_ids=$2::jsonb WHERE id=$1`, [batchId, JSON.stringify(resourceIds)]);
  return batchId;
}

export async function listPendingBatches() {
  const { rows: batches } = await query(`
    SELECT b.id,b.topic_id,t.name AS topic_name,b.generation_source,b.question_ids,b.resource_ids,b.lesson_ids,
           b.avg_quality_score::float8 AS avg_quality_score,b.created_at
      FROM content_review_batch b JOIN topic t ON t.id=b.topic_id
     WHERE b.status='PENDING' ORDER BY b.created_at DESC`);
  const out=[];
  for (const b of batches) {
    const { rows: questions } = await query(
      `SELECT id,prompt,options,answer_index,explanation,shortcut,common_mistake,difficulty::float8 AS difficulty,
              quality_score::float8 AS quality_score,source,source_year,exam_code,exam_group,paper,question_number,source_page
         FROM question WHERE id=ANY($1::text[])`, [b.question_ids]);
    const resourceIds=Array.isArray(b.resource_ids)?b.resource_ids:[];
    const { rows: resources } = await query(`SELECT id,title,body,source,status FROM topic_resource WHERE id=ANY($1::uuid[])`, [resourceIds]);
    const lessonIds=Array.isArray(b.lesson_ids)?b.lesson_ids:[];
    const { rows: lessons } = await query(`SELECT id,topic_id,title,concept,definition,explanation,examples,revision_notes,source_ids FROM content_engine_lesson_staging WHERE id=ANY($1::text[])`, [lessonIds]);
    out.push({id:b.id,topicId:b.topic_id,topicName:b.topic_name,generationSource:b.generation_source,avgQualityScore:b.avg_quality_score,createdAt:b.created_at,questions,resources,lessons});
  }
  return out;
}

export async function approveBatch(batchId, reviewerId=null) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows }=await client.query(`SELECT question_ids,resource_ids,lesson_ids,status FROM content_review_batch WHERE id=$1 FOR UPDATE`,[batchId]);
    if(!rows.length) throw new ContentReviewError('BATCH_NOT_FOUND',`No review batch ${batchId}`);
    if(rows[0].status!=='PENDING') throw new ContentReviewError('ALREADY_DECIDED',`Batch already ${rows[0].status}`);
    await client.query(`UPDATE question SET status='PUBLISHED',updated_at=now() WHERE id=ANY($1::text[])`,[rows[0].question_ids]);
    await client.query(`UPDATE topic_resource SET status='PUBLISHED',reviewed_at=now(),reviewed_by=$2 WHERE id=ANY($1::uuid[])`,[rows[0].resource_ids,reviewerId]);
    for(const lessonId of rows[0].lesson_ids||[]) {
      const { rows:s }=await client.query(`SELECT * FROM content_engine_lesson_staging WHERE id=$1 FOR UPDATE`,[lessonId]);
      if(!s.length) continue;
      const l=s[0];
      await client.query(`INSERT INTO lesson(topic_id,title,concept,example_problem,example_steps,example_answer,tip,definition,formulas,shortcuts,common_mistakes)
        VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)
        ON CONFLICT(topic_id) DO UPDATE SET title=EXCLUDED.title,concept=EXCLUDED.concept,definition=EXCLUDED.definition,updated_at=now()`,
        [l.topic_id,l.title,l.concept,l.explanation||'',JSON.stringify(l.examples||[]),'',(l.revision_notes||[])[0]||'',l.definition||'']);
      await client.query(`UPDATE content_engine_lesson_staging SET status='PUBLISHED',reviewed_at=now(),reviewed_by=$2 WHERE id=$1`,[lessonId,reviewerId]);
    }
    await client.query(`UPDATE content_review_batch SET status='APPROVED',reviewed_at=now(),reviewed_by=$2 WHERE id=$1`,[batchId,reviewerId]);
    await client.query('COMMIT');
    return {approved:rows[0].question_ids.length,resourcesApproved:rows[0].resource_ids.length,lessonsApproved:(rows[0].lesson_ids||[]).length};
  } catch(err){await client.query('ROLLBACK');throw err;} finally{client.release();}
}

export async function rejectBatch(batchId, reviewerId=null) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows }=await client.query(`SELECT question_ids,resource_ids,lesson_ids,status FROM content_review_batch WHERE id=$1 FOR UPDATE`,[batchId]);
    if(!rows.length) throw new ContentReviewError('BATCH_NOT_FOUND',`No review batch ${batchId}`);
    if(rows[0].status!=='PENDING') throw new ContentReviewError('ALREADY_DECIDED',`Batch already ${rows[0].status}`);
    await client.query(`UPDATE question SET status='ARCHIVED',updated_at=now() WHERE id=ANY($1::text[])`,[rows[0].question_ids]);
    await client.query(`UPDATE topic_resource SET status='ARCHIVED',reviewed_at=now(),reviewed_by=$2 WHERE id=ANY($1::uuid[])`,[rows[0].resource_ids,reviewerId]);
    await client.query(`UPDATE content_engine_lesson_staging SET status='REJECTED',reviewed_at=now(),reviewed_by=$2 WHERE id=ANY($1::text[])`,[rows[0].lesson_ids||[],reviewerId]);
    await client.query(`UPDATE content_review_batch SET status='REJECTED',reviewed_at=now(),reviewed_by=$2 WHERE id=$1`,[batchId,reviewerId]);
    await client.query('COMMIT');
    return {rejected:rows[0].question_ids.length,resourcesRejected:rows[0].resource_ids.length,lessonsRejected:(rows[0].lesson_ids||[]).length};
  } catch(err){await client.query('ROLLBACK');throw err;} finally{client.release();}
}
