import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { pool } from '../../../../../lib/db.mjs';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../../lib/permissions.mjs';
import { contentEngineManifestHash } from '../../../../../lib/contentEngineManifest.mjs';

export const dynamic = 'force-dynamic';
const DIFFICULTY = Object.freeze({ easy: 0.25, medium: 0.55, hard: 0.80 });

function normalizedHash(text) {
  return crypto.createHash('sha256').update(String(text).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()).digest('hex');
}
function safeEqualHex(a, b) {
  const left = Buffer.from(a, 'utf8'); const right = Buffer.from(b, 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE) || await requirePermission(request, PERMISSIONS.AI_GENERATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Content import permission required' }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 }); }
  const publicationId = typeof body.publicationId === 'string' ? body.publicationId.trim() : '';
  const items = Array.isArray(body.items) ? body.items : [];
  const suppliedHash = typeof body.manifestHash === 'string' ? body.manifestHash : '';
  if (!publicationId || !items.length || !suppliedHash) return NextResponse.json({ code: 'INVALID_MANIFEST', message: 'publicationId, manifestHash and items are required' }, { status: 400 });
  if (items.length > 5000) return NextResponse.json({ code: 'MANIFEST_TOO_LARGE', message: 'Maximum 5000 items per publication' }, { status: 400 });
  const expectedHash = contentEngineManifestHash(publicationId, items);
  if (!safeEqualHex(suppliedHash, expectedHash)) return NextResponse.json({ code: 'MANIFEST_HASH_MISMATCH', message: 'Manifest hash does not match payload' }, { status: 409 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(`SELECT publication_id,status FROM content_engine_publication WHERE publication_id=$1 OR manifest_hash=$2 FOR UPDATE`, [publicationId, expectedHash]);
    if (existing.rows.length) { await client.query('ROLLBACK'); return NextResponse.json({ code: 'ALREADY_IMPORTED', publicationId, status: existing.rows[0].status }, { status: 409 }); }

    const groups = new Map();
    for (const item of items) {
      if (!item || !['lesson','mcq'].includes(item.kind) || !item.content_id || !item.topic_id || !item.payload) throw new Error('INVALID_ITEM');
      const payload = item.payload;
      if (payload.isPyq === true || payload.isPYQ === true || payload.pyq === true || payload.contentType === 'pyq' || payload.content_type === 'pyq') throw new Error(`PYQ_CONTENT_BLOCKED:${item.content_id}`);
      if (publicationId.startsWith('ai-')) {
        const sourceIds = Array.isArray(payload.sourceIds) ? [...new Set(payload.sourceIds.map(String))] : [];
        if (!sourceIds.length || sourceIds.some((id) => !UUID_PATTERN.test(id))) throw new Error(`MISSING_PROVENANCE:${item.content_id}`);
        const { rows: approvedSources } = await client.query(`
          SELECT r.id::text AS id,r.body
            FROM topic_resource r
            JOIN content_lineage l ON l.resource_id=r.id
           WHERE r.id::text=ANY($1::text[]) AND r.topic_id=$2 AND r.status='PUBLISHED'
             AND COALESCE(r.source,'') NOT ILIKE '%pyq%'
             AND l.source_year IS NULL AND l.exam_code IS NULL AND l.exam_group IS NULL AND l.paper IS NULL
             AND COALESCE(l.source_file_name,'') !~* '(pyq|previous[ _-]?year|question[ _-]?(paper|booklet))'
        `, [sourceIds, item.topic_id]);
        if (approvedSources.length !== sourceIds.length) throw new Error(`INVALID_SOURCE_PROVENANCE:${item.content_id}`);
        if (item.kind === 'mcq') {
          const anchor = payload.answerEvidence;
          const source = approvedSources.find((row) => row.id === anchor?.sourceId);
          if (!source || typeof anchor.quote !== 'string' || anchor.quote.trim().length < 24 || !String(source.body || '').includes(anchor.quote.trim())) {
            throw new Error(`INVALID_ANSWER_EVIDENCE:${item.content_id}`);
          }
        }
      }
      const mayCreate = await canActOnTopic(admin, PERMISSIONS.CONTENT_CREATE, item.topic_id);
      const mayGenerate = await canActOnTopic(admin, PERMISSIONS.AI_GENERATE, item.topic_id);
      if (!mayCreate && !mayGenerate) throw new Error(`FORBIDDEN_TOPIC:${item.topic_id}`);
      if (!groups.has(item.topic_id)) groups.set(item.topic_id, { questions: [], lessons: [] });
      groups.get(item.topic_id)[item.kind === 'mcq' ? 'questions' : 'lessons'].push(item);
    }

    await client.query(`INSERT INTO content_engine_publication(publication_id,manifest_hash,item_count,status,created_by) VALUES($1,$2,$3,'IMPORTED',$4)`, [publicationId, expectedHash, items.length, admin.accountId ?? null]);
    const batchIds = [];
    for (const [topicId, group] of groups) {
      const questionIds = []; const lessonIds = [];
      for (const item of group.lessons) {
        const p=item.payload; const lessonId=String(item.content_id);
        if ((await client.query(`SELECT id FROM content_engine_lesson_staging WHERE id=$1`,[lessonId])).rows.length) throw new Error(`DUPLICATE_LESSON:${lessonId}`);
        await client.query(`INSERT INTO content_engine_lesson_staging(id,topic_id,title,concept,definition,explanation,examples,revision_notes,source_ids,engine_version,publication_id,status) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,'PENDING')`, [lessonId,topicId,String(p.title||''),String(p.concept||''),String(p.definition||''),String(p.explanation||''),JSON.stringify(Array.isArray(p.examples)?p.examples:[]),JSON.stringify(Array.isArray(p.revisionNotes)?p.revisionNotes:[]),JSON.stringify(Array.isArray(p.sourceIds)?p.sourceIds:[]),Number.isInteger(p.version)?p.version:1,publicationId]);
        lessonIds.push(lessonId);
      }
      for (const item of group.questions) {
        const p=item.payload; const id=String(item.content_id);
        if (!Array.isArray(p.options)||p.options.length<2||!Number.isInteger(p.answerIndex)||p.answerIndex<0||p.answerIndex>=p.options.length) throw new Error(`INVALID_MCQ:${id}`);
        if (new Set(p.options.map(String)).size!==p.options.length) throw new Error(`DUPLICATE_OPTIONS:${id}`);
        if (!p.question||!p.explanation||!Array.isArray(p.sourceIds)||!p.sourceIds.length) throw new Error(`MISSING_PROVENANCE:${id}`);
        if ((await client.query(`SELECT id FROM question WHERE id=$1 OR (language='en' AND normalized_hash=$2)`,[id,normalizedHash(p.question)])).rows.length) throw new Error(`DUPLICATE_MCQ:${id}`);
        const difficulty=DIFFICULTY[p.difficulty]; if (difficulty===undefined) throw new Error(`INVALID_DIFFICULTY:${id}`);
        await client.query(`INSERT INTO question(id,topic_id,language,prompt,options,answer_index,explanation,trap,difficulty,estimated_seconds,source,source_year,status,normalized_hash,generation_source) VALUES($1,$2,'en',$3,$4::jsonb,$5,$6,NULL,$7,45,$8,NULL,'DRAFT',$9,'ai')`, [id,topicId,String(p.question),JSON.stringify(p.options),p.answerIndex,String(p.explanation),difficulty,`content-engine:${publicationId}`,normalizedHash(p.question)]);
        questionIds.push(id);
      }
      const batch=await client.query(`INSERT INTO content_review_batch(topic_id,generation_source,question_ids,resource_ids,lesson_ids,status) VALUES($1,'ai',$2::jsonb,'[]'::jsonb,$3::jsonb,'PENDING') RETURNING id`,[topicId,JSON.stringify(questionIds),JSON.stringify(lessonIds)]);
      const batchId = batch.rows[0].id;
      batchIds.push(batchId);
      for (const item of group.lessons) {
        const p=item.payload;
        await client.query(`INSERT INTO content_engine_lineage(publication_id,content_id,content_kind,platform_id,topic_id,source_ids,engine_version,review_batch_id,status) VALUES($1,$2,'lesson',NULL,$3,$4::jsonb,$5,$6,'IMPORTED')`, [publicationId,String(item.content_id),topicId,JSON.stringify(Array.isArray(p.sourceIds)?p.sourceIds:[]),Number.isInteger(p.version)?p.version:1,batchId]);
      }
      for (const item of group.questions) {
        const p=item.payload;
        await client.query(`INSERT INTO content_engine_lineage(publication_id,content_id,content_kind,platform_id,topic_id,source_ids,engine_version,review_batch_id,status) VALUES($1,$2,'mcq',NULL,$3,$4::jsonb,$5,$6,'IMPORTED')`, [publicationId,String(item.content_id),topicId,JSON.stringify(Array.isArray(p.sourceIds)?p.sourceIds:[]),Number.isInteger(p.version)?p.version:null,batchId]);
      }
    }
    await client.query('COMMIT');
    return NextResponse.json({ ok:true, publicationId, manifestHash:expectedHash, importedItems:items.length, reviewBatchIds:batchIds, status:'IMPORTED_PENDING_REVIEW' },{status:201});
  } catch(error) {
    await client.query('ROLLBACK'); const message=error instanceof Error?error.message:'Import failed';
    const code=message.startsWith('FORBIDDEN_TOPIC:')?'FORBIDDEN_TOPIC':message.startsWith('PYQ_CONTENT_BLOCKED:')?'PYQ_CONTENT_BLOCKED':message.startsWith('DUPLICATE_')?'DUPLICATE_CONTENT':message.startsWith('INVALID_')||message.startsWith('MISSING_')?'INVALID_CONTENT':'IMPORT_FAILED';
    return NextResponse.json({code,message},{status:code==='FORBIDDEN_TOPIC'?403:400});
  } finally { client.release(); }
}
