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

async function recordLineage(client, { publicationId, contentId, contentKind, platformId, topicId, sourceIds, engineVersion, reviewBatchId, status }) {
  await client.query(`
    INSERT INTO content_engine_lineage
      (publication_id,content_id,content_kind,platform_id,topic_id,source_ids,engine_version,review_batch_id,status,published_at)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,CASE WHEN $9='PUBLISHED' THEN now() ELSE NULL END)
    ON CONFLICT (publication_id,content_id) DO UPDATE SET
      platform_id=EXCLUDED.platform_id,
      source_ids=EXCLUDED.source_ids,
      engine_version=EXCLUDED.engine_version,
      review_batch_id=EXCLUDED.review_batch_id,
      status=EXCLUDED.status,
      published_at=EXCLUDED.published_at`,
    [publicationId, contentId, contentKind, platformId, topicId, JSON.stringify(sourceIds || []), engineVersion, reviewBatchId, status]
  );
}

export async function approveBatch(batchId, reviewerId=null) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows }=await client.query(`SELECT b.question_ids,b.resource_ids,b.lesson_ids,b.status,b.topic_id,
        COALESCE(qp.publication_id,lp.publication_id) AS publication_id
      FROM content_review_batch b
      LEFT JOIN LATERAL (
        SELECT publication_id FROM content_engine_lineage WHERE content_id=ANY(b.question_ids) AND content_kind='mcq' LIMIT 1
      ) qp ON true
      LEFT JOIN LATERAL (
        SELECT publication_id FROM content_engine_lineage WHERE content_id=ANY(b.lesson_ids) AND content_kind='lesson' LIMIT 1
      ) lp ON true
      WHERE b.id=$1 FOR UPDATE`,[batchId]);
    if(!rows.length) throw new ContentReviewError('BATCH_NOT_FOUND',`No review batch ${batchId}`);
    if(rows[0].status!=='PENDING') throw new ContentReviewError('ALREADY_DECIDED',`Batch already ${rows[0].status}`);
    const batch=rows[0];
    await client.query(`UPDATE question SET status='PUBLISHED',updated_at=now() WHERE id=ANY($1::text[])`,[batch.question_ids]);
    await client.query(`UPDATE topic_resource SET status='PUBLISHED',reviewed_at=now(),reviewed_by=$2 WHERE id=ANY($1::uuid[])`,[batch.resource_ids,reviewerId]);
    for(const lessonId of batch.lesson_ids||[]) {
      const { rows:s }=await client.query(`SELECT * FROM content_engine_lesson_staging WHERE id=$1 FOR UPDATE`,[lessonId]);
      if(!s.length) continue;
      const l=s[0];
      await client.query(`INSERT INTO lesson(topic_id,title,concept,example_problem,example_steps,example_answer,tip,definition,formulas,shortcuts,common_mistakes)
        VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)
        ON CONFLICT(topic_id) DO UPDATE SET title=EXCLUDED.title,concept=EXCLUDED.concept,definition=EXCLUDED.definition,updated_at=now()`,
        [l.topic_id,l.title,l.concept,l.explanation||'',JSON.stringify(l.examples||[]),'',(l.revision_notes||[])[0]||'',l.definition||'']);
      await client.query(`UPDATE content_engine_lesson_staging SET status='PUBLISHED',reviewed_at=now(),reviewed_by=$2 WHERE id=$1`,[lessonId,reviewerId]);
      await recordLineage(client,{publicationId:l.publication_id,contentId:lessonId,contentKind:'lesson',platformId:lessonId,topicId:l.topic_id,sourceIds:l.source_ids,engineVersion:l.engine_version,reviewBatchId:batchId,status:'PUBLISHED'});
    }
    for(const questionId of batch.question_ids||[]) {
      const { rows:q }=await client.query(`SELECT id,topic_id,source FROM question WHERE id=$1`,[questionId]);
      if(!q.length) continue;
      const publicationId=(q[0].source||'').startsWith('content-engine:') ? q[0].source.slice('content-engine:'.length) : null;
      const lineage=publicationId ? await client.query(`SELECT source_ids,engine_version FROM content_engine_lineage WHERE publication_id=$1 AND content_id=$2`,[publicationId,questionId]) : {rows:[]};
      await recordLineage(client,{publicationId,contentId:questionId,contentKind:'mcq',platformId:questionId,topicId:q[0].topic_id,sourceIds:lineage.rows[0]?.source_ids||[],engineVersion:lineage.rows[0]?.engine_version||null,reviewBatchId:batchId,status:'PUBLISHED'});
    }
    if(batch.publication_id) await client.query(`UPDATE content_engine_publication SET status='APPROVED',reviewed_at=now(),reviewed_by=$2 WHERE publication_id=$1`,[batch.publication_id,reviewerId]);
    await client.query(`UPDATE content_review_batch SET status='APPROVED',reviewed_at=now(),reviewed_by=$2 WHERE id=$1`,[batchId,reviewerId]);
    await client.query('COMMIT');
    return {approved:batch.question_ids.length,resourcesApproved:batch.resource_ids.length,lessonsApproved:(batch.lesson_ids||[]).length};
  } catch(err){await client.query('ROLLBACK');throw err;} finally{client.release();}
}

export async function rejectBatch(batchId, reviewerId=null) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows }=await client.query(`SELECT question_ids,resource_ids,lesson_ids,status,topic_id FROM content_review_batch WHERE id=$1 FOR UPDATE`,[batchId]);
    if(!rows.length) throw new ContentReviewError('BATCH_NOT_FOUND',`No review batch ${batchId}`);
    if(rows[0].status!=='PENDING') throw new ContentReviewError('ALREADY_DECIDED',`Batch already ${rows[0].status}`);
    const batch=rows[0];
    await client.query(`UPDATE question SET status='ARCHIVED',updated_at=now() WHERE id=ANY($1::text[])`,[batch.question_ids]);
    await client.query(`UPDATE topic_resource SET status='ARCHIVED',reviewed_at=now(),reviewed_by=$2 WHERE id=ANY($1::uuid[])`,[batch.resource_ids,reviewerId]);
    await client.query(`UPDATE content_engine_lesson_staging SET status='REJECTED',reviewed_at=now(),reviewed_by=$2 WHERE id=ANY($1::text[])`,[batch.lesson_ids||[],reviewerId]);
    for(const lessonId of batch.lesson_ids||[]) {
      const { rows:s }=await client.query(`SELECT publication_id,topic_id,source_ids,engine_version FROM content_engine_lesson_staging WHERE id=$1`,[lessonId]);
      if(s.length) await recordLineage(client,{publicationId:s[0].publication_id,contentId:lessonId,contentKind:'lesson',platformId:null,topicId:s[0].topic_id,sourceIds:s[0].source_ids,engineVersion:s[0].engine_version,reviewBatchId:batchId,status:'REJECTED'});
    }
    for(const questionId of batch.question_ids||[]) {
      const { rows:q }=await client.query(`SELECT id,topic_id,source FROM question WHERE id=$1`,[questionId]);
      if(q.length && (q[0].source||'').startsWith('content-engine:')) {
        const publicationId=q[0].source.slice('content-engine:'.length);
        await recordLineage(client,{publicationId,contentId:questionId,contentKind:'mcq',platformId:null,topicId:q[0].topic_id,sourceIds:[],engineVersion:null,reviewBatchId:batchId,status:'REJECTED'});
      }
    }
    const publicationIds=await client.query(`SELECT DISTINCT publication_id FROM content_engine_lineage WHERE review_batch_id=$1`,[batchId]);
    for(const row of publicationIds.rows) await client.query(`UPDATE content_engine_publication SET status='REJECTED',reviewed_at=now(),reviewed_by=$2 WHERE publication_id=$1 AND NOT EXISTS (SELECT 1 FROM content_engine_lineage WHERE publication_id=$1 AND status='PUBLISHED')`,[row.publication_id,reviewerId]);
    await client.query(`UPDATE content_review_batch SET status='REJECTED',reviewed_at=now(),reviewed_by=$2 WHERE id=$1`,[batchId,reviewerId]);
    await client.query('COMMIT');
    return {rejected:batch.question_ids.length,resourcesRejected:batch.resource_ids.length,lessonsRejected:(batch.lesson_ids||[]).length};
  } catch(err){await client.query('ROLLBACK');throw err;} finally{client.release();}
}
