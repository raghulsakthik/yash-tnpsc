import { query, pool } from './db.mjs';
import { PERMISSIONS, canActOnTopic } from './permissions.mjs';

export class ContentReviewError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function mapStagedLessonToLiveFields(lesson) {
  const examples = Array.isArray(lesson.examples) ? lesson.examples : [];
  const primary = examples.find((example) => example && typeof example === 'object' && !Array.isArray(example)) ?? {};
  const steps = Array.isArray(primary.steps)
    ? primary.steps.map((step) => String(step).trim()).filter(Boolean)
    : examples.filter((example) => typeof example === 'string' && example.trim()).map((step) => step.trim());
  const exampleProblem = String(primary.problem ?? '').trim();
  const exampleAnswer = String(primary.answer ?? '').trim();
  const revisionNotes = Array.isArray(lesson.revision_notes) ? lesson.revision_notes.map(String).filter(Boolean) : [];
  const definition = String(lesson.definition ?? '').trim();
  const explanation = String(lesson.explanation ?? '').trim();
  const contentMarkdown = [
    lesson.concept ? `## Concept\n\n${String(lesson.concept).trim()}` : '',
    definition ? `## Definition\n\n${definition}` : '',
    explanation ? `## Explanation\n\n${explanation}` : '',
    exampleProblem ? `## Worked example\n\n**Problem:** ${exampleProblem}\n\n${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\n**Answer:** ${exampleAnswer}` : '',
    revisionNotes.length ? `## Revision notes\n\n${revisionNotes.map((note) => `- ${note}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
  return {
    exampleProblem,
    exampleSteps: steps,
    exampleAnswer,
    tip: revisionNotes[0] ?? '',
    description: definition || String(lesson.concept ?? '').trim().slice(0, 280),
    contentMarkdown,
    difficulty: 'Beginner',
    estimatedDurationMinutes: 20,
  };
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

export async function listPendingBatches({ admin, canReviewQuestions, canReviewContent } = {}) {
  if (!admin || (!canReviewQuestions && !canReviewContent)) return [];
  const { rows: batches } = await query(`
    SELECT b.id,b.topic_id,t.name AS topic_name,b.generation_source,b.question_ids,b.resource_ids,b.lesson_ids,
           b.avg_quality_score::float8 AS avg_quality_score,b.created_at
      FROM content_review_batch b JOIN topic t ON t.id=b.topic_id
     WHERE b.status='PENDING' ORDER BY b.created_at DESC`);
  const out=[];
  for (const b of batches) {
    const questionIds = Array.isArray(b.question_ids) ? b.question_ids : [];
    const resourceIds = Array.isArray(b.resource_ids) ? b.resource_ids : [];
    const lessonIds = Array.isArray(b.lesson_ids) ? b.lesson_ids : [];
    const hasQuestions = questionIds.length > 0;
    const hasContent = resourceIds.length > 0 || lessonIds.length > 0;
    if (!hasQuestions && !hasContent) continue;
    if (hasQuestions && (!canReviewQuestions || !(await canActOnTopic(admin, PERMISSIONS.REVIEW_QUESTION, b.topic_id)))) continue;
    if (hasContent && (!canReviewContent || !(await canActOnTopic(admin, PERMISSIONS.REVIEW_CONTENT, b.topic_id)))) continue;

    const { rows: questions } = await query(
      `SELECT id,language,prompt,options,answer_index,explanation,shortcut,common_mistake,difficulty::float8 AS difficulty,
              quality_score::float8 AS quality_score,source,source_year,exam_code,exam_group,paper,question_number,source_page,generation_source
         FROM question WHERE id=ANY($1::text[])`, [b.question_ids]);
    const { rows: questionLineage } = await query(
      `SELECT content_id,source_ids FROM content_engine_lineage WHERE content_kind='mcq' AND content_id=ANY($1::text[])`,
      [questionIds]
    );
    const questionSourceIds = [...new Set(questionLineage.flatMap((lineage) => Array.isArray(lineage.source_ids) ? lineage.source_ids : []))];
    const { rows: questionSources } = await query(
      `SELECT id::text AS id,title,source,body FROM topic_resource WHERE id::text=ANY($1::text[])`,
      [questionSourceIds]
    );
    const questionsWithEvidence = questions.map((question) => {
      const lineage = questionLineage.find((item) => item.content_id === question.id);
      const sourceIds = Array.isArray(lineage?.source_ids) ? lineage.source_ids : [];
      return { ...question, sourceEvidence: questionSources.filter((source) => sourceIds.includes(source.id)) };
    });
    const { rows: resources } = await query(`SELECT id,title,body,source,status FROM topic_resource WHERE id=ANY($1::uuid[])`, [resourceIds]);
    const { rows: lessons } = await query(`SELECT id,topic_id,title,concept,definition,explanation,examples,revision_notes,source_ids FROM content_engine_lesson_staging WHERE id=ANY($1::text[])`, [lessonIds]);
    const lessonSourceIds = [...new Set(lessons.flatMap((lesson) => Array.isArray(lesson.source_ids) ? lesson.source_ids : []))];
    const { rows: lessonSources } = await query(
      `SELECT id::text AS id,title,source,body FROM topic_resource WHERE id::text=ANY($1::text[])`,
      [lessonSourceIds]
    );
    const lessonsWithEvidence = lessons.map((lesson) => ({
      ...lesson,
      sourceEvidence: lessonSources.filter((source) => (lesson.source_ids || []).includes(source.id)),
    }));
    out.push({id:b.id,topicId:b.topic_id,topicName:b.topic_name,generationSource:b.generation_source,avgQualityScore:b.avg_quality_score,createdAt:b.created_at,questions:questionsWithEvidence,resources,lessons:lessonsWithEvidence});
  }
  return out;
}

async function recordLineage(client, { publicationId, contentId, contentKind, platformId, topicId, sourceIds, engineVersion, reviewBatchId, status, versionNumber = null }) {
  if (!publicationId) return;
  await client.query(`
    INSERT INTO content_engine_lineage
      (publication_id,content_id,content_kind,platform_id,topic_id,source_ids,engine_version,review_batch_id,status,version_number,published_at)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,CASE WHEN $9='PUBLISHED' THEN now() ELSE NULL END)
    ON CONFLICT (publication_id,content_id) DO UPDATE SET
      platform_id=EXCLUDED.platform_id,
      source_ids=EXCLUDED.source_ids,
      engine_version=EXCLUDED.engine_version,
      review_batch_id=EXCLUDED.review_batch_id,
      status=EXCLUDED.status,
      version_number=EXCLUDED.version_number,
      published_at=EXCLUDED.published_at`,
    [publicationId, contentId, contentKind, platformId, topicId, JSON.stringify(sourceIds || []), engineVersion, reviewBatchId, status, versionNumber]
  );
}

async function publishLessonVersion(client, lesson, batchId, reviewerId) {
  const current = await client.query(
    `SELECT version_number FROM content_engine_lesson_version WHERE topic_id=$1 AND status='PUBLISHED' ORDER BY version_number DESC LIMIT 1 FOR UPDATE`,
    [lesson.topic_id]
  );
  const versionNumber = (current.rows[0]?.version_number || 0) + 1;

  await client.query(
    `UPDATE content_engine_lesson_version SET status='SUPERSEDED',superseded_at=now()
       WHERE topic_id=$1 AND status='PUBLISHED'`,
    [lesson.topic_id]
  );

  await client.query(
    `INSERT INTO content_engine_lesson_version
      (topic_id,publication_id,content_id,version_number,title,concept,definition,explanation,examples,revision_notes,source_ids,engine_version,review_batch_id,status,published_at,reviewed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,'PUBLISHED',now(),$14)`,
    [lesson.topic_id,lesson.publication_id,lesson.id,versionNumber,lesson.title,lesson.concept,lesson.definition,lesson.explanation,
      JSON.stringify(lesson.examples || []),JSON.stringify(lesson.revision_notes || []),JSON.stringify(lesson.source_ids || []),lesson.engine_version,batchId,reviewerId]
  );

  const liveFields = mapStagedLessonToLiveFields(lesson);
  await client.query(`
    INSERT INTO lesson(
      topic_id,title,concept,example_problem,example_steps,example_answer,tip,definition,
      formulas,shortcuts,common_mistakes,description,learning_objectives,difficulty,
      estimated_duration_minutes,content_markdown,status,version
    )
    VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,$9,'[]'::jsonb,$10,$11,$12,'PUBLISHED',1)
    ON CONFLICT(topic_id) DO UPDATE SET
      title=EXCLUDED.title,
      concept=EXCLUDED.concept,
      definition=EXCLUDED.definition,
      example_problem=EXCLUDED.example_problem,
      example_steps=EXCLUDED.example_steps,
      example_answer=EXCLUDED.example_answer,
      tip=EXCLUDED.tip,
      description=EXCLUDED.description,
      learning_objectives=EXCLUDED.learning_objectives,
      difficulty=EXCLUDED.difficulty,
      estimated_duration_minutes=EXCLUDED.estimated_duration_minutes,
      content_markdown=EXCLUDED.content_markdown,
      status='PUBLISHED',
      version=lesson.version+1,
      updated_at=now()`,
    [lesson.topic_id,lesson.title,lesson.concept,liveFields.exampleProblem,JSON.stringify(liveFields.exampleSteps),liveFields.exampleAnswer,liveFields.tip,lesson.definition || '',liveFields.description,liveFields.difficulty,liveFields.estimatedDurationMinutes,liveFields.contentMarkdown]
  );

  const platformId = lesson.topic_id;
  await client.query(`UPDATE content_engine_lesson_staging SET status='PUBLISHED',reviewed_at=now(),reviewed_by=$2 WHERE id=$1`,[lesson.id,reviewerId]);
  await recordLineage(client,{publicationId:lesson.publication_id,contentId:lesson.id,contentKind:'lesson',platformId,topicId:lesson.topic_id,sourceIds:lesson.source_ids,engineVersion:lesson.engine_version,reviewBatchId:batchId,status:'PUBLISHED',versionNumber});
  return { versionNumber, platformId };
}

export async function approveBatch(batchId, reviewerId=null) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows }=await client.query(`SELECT question_ids,resource_ids,lesson_ids,status,topic_id
      FROM content_review_batch WHERE id=$1 FOR UPDATE`,[batchId]);
    if(rows.length){
      const pub = await client.query(`SELECT publication_id FROM content_engine_lineage
        WHERE review_batch_id=$1 ORDER BY created_at ASC LIMIT 1`,[batchId]);
      rows[0].publication_id = pub.rows[0]?.publication_id ?? null;
    }
    if(!rows.length) throw new ContentReviewError('BATCH_NOT_FOUND',`No review batch ${batchId}`);
    if(rows[0].status!=='PENDING') throw new ContentReviewError('ALREADY_DECIDED',`Batch already ${rows[0].status}`);
    const batch=rows[0];
    await client.query(`UPDATE question SET status='PUBLISHED',updated_at=now() WHERE id=ANY($1::text[])`,[batch.question_ids]);
    await client.query(`UPDATE topic_resource SET status='PUBLISHED',reviewed_at=now(),reviewed_by=$2 WHERE id=ANY($1::uuid[])`,[batch.resource_ids,reviewerId]);

    const publishedVersions=[];
    for(const lessonId of batch.lesson_ids||[]) {
      const { rows:s }=await client.query(`SELECT * FROM content_engine_lesson_staging WHERE id=$1 FOR UPDATE`,[lessonId]);
      if(!s.length) continue;
      publishedVersions.push(await publishLessonVersion(client,s[0],batchId,reviewerId));
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
    return {approved:batch.question_ids.length,resourcesApproved:batch.resource_ids.length,lessonsApproved:(batch.lesson_ids||[]).length,publishedVersions};
  } catch(err){await client.query('ROLLBACK');throw err;} finally{client.release();}
}

export async function rollbackLessonVersion({ topicId, versionNumber, reviewerId = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM content_engine_lesson_version WHERE topic_id=$1 AND version_number=$2 FOR UPDATE`,
      [topicId, versionNumber]
    );
    if (!rows.length) throw new ContentReviewError('VERSION_NOT_FOUND', `No engine lesson version ${versionNumber} for ${topicId}`);
    const target = rows[0];

    await client.query(`UPDATE content_engine_lesson_version SET status='SUPERSEDED',superseded_at=COALESCE(superseded_at,now()) WHERE topic_id=$1 AND status='PUBLISHED' AND version_number<>$2`,[topicId,versionNumber]);
    await client.query(`UPDATE content_engine_lesson_version SET status='PUBLISHED',rolled_back_at=now(),published_at=now(),reviewed_by=$3 WHERE topic_id=$1 AND version_number=$2`,[topicId,versionNumber,reviewerId]);

    const liveFields = mapStagedLessonToLiveFields(target);
    await client.query(`
      INSERT INTO lesson(
        topic_id,title,concept,example_problem,example_steps,example_answer,tip,definition,
        formulas,shortcuts,common_mistakes,description,learning_objectives,difficulty,
        estimated_duration_minutes,content_markdown,status,version
      )
      VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,$9,'[]'::jsonb,$10,$11,$12,'PUBLISHED',1)
      ON CONFLICT(topic_id) DO UPDATE SET
        title=EXCLUDED.title,
        concept=EXCLUDED.concept,
        definition=EXCLUDED.definition,
        example_problem=EXCLUDED.example_problem,
        example_steps=EXCLUDED.example_steps,
        example_answer=EXCLUDED.example_answer,
        tip=EXCLUDED.tip,
        description=EXCLUDED.description,
        learning_objectives=EXCLUDED.learning_objectives,
        difficulty=EXCLUDED.difficulty,
        estimated_duration_minutes=EXCLUDED.estimated_duration_minutes,
        content_markdown=EXCLUDED.content_markdown,
        status='PUBLISHED',
        version=lesson.version+1,
        updated_at=now()`,
      [topicId,target.title,target.concept,liveFields.exampleProblem,JSON.stringify(liveFields.exampleSteps),liveFields.exampleAnswer,liveFields.tip,target.definition || '',liveFields.description,liveFields.difficulty,liveFields.estimatedDurationMinutes,liveFields.contentMarkdown]
    );

    await client.query(`UPDATE content_engine_lineage SET status='REJECTED',platform_id=NULL WHERE topic_id=$1 AND content_kind='lesson' AND status='PUBLISHED' AND version_number<>$2`,[topicId,versionNumber]);
    await client.query(`UPDATE content_engine_lineage SET status='PUBLISHED',platform_id=$1,published_at=now(),version_number=$2 WHERE publication_id=$3 AND content_id=$4 AND content_kind='lesson'`,[topicId,versionNumber,target.publication_id,target.content_id]);

    await client.query('COMMIT');
    return { topicId, versionNumber, rolledBack: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
