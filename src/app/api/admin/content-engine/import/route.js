import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { pool } from '../../../../../../lib/db.mjs';
import { requirePermission } from '../../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic } from '../../../../../../lib/permissions.mjs';

export const dynamic = 'force-dynamic';

const DIFFICULTY = Object.freeze({ easy: 0.25, medium: 0.55, hard: 0.80 });

function manifestHash(publicationId, items) {
  const canonical = JSON.stringify({ publication_id: publicationId, items }, Object.keys({ publication_id: 1, items: 1 }).sort());
  // Stable recursive ordering is safer than relying on caller property order.
  const stable = JSON.stringify({
    publication_id: publicationId,
    items: items.map((x) => ({ kind: x.kind, content_id: x.content_id, topic_id: x.topic_id, payload: x.payload }))
  });
  return crypto.createHash('sha256').update(stable).digest('hex');
}

function normalizedHash(text) {
  return crypto.createHash('sha256').update(String(text).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()).digest('hex');
}

export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Content import permission required' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 }); }
  const publicationId = typeof body.publicationId === 'string' ? body.publicationId.trim() : '';
  const items = Array.isArray(body.items) ? body.items : [];
  const suppliedHash = typeof body.manifestHash === 'string' ? body.manifestHash : '';
  if (!publicationId || !items.length || !suppliedHash) return NextResponse.json({ code: 'INVALID_MANIFEST', message: 'publicationId, manifestHash and items are required' }, { status: 400 });
  if (items.length > 5000) return NextResponse.json({ code: 'MANIFEST_TOO_LARGE', message: 'Maximum 5000 items per publication' }, { status: 400 });

  const expectedHash = manifestHash(publicationId, items);
  if (!crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(expectedHash))) {
    return NextResponse.json({ code: 'MANIFEST_HASH_MISMATCH', message: 'Manifest hash does not match payload' }, { status: 409 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(`SELECT publication_id,status FROM content_engine_publication WHERE publication_id=$1 OR manifest_hash=$2 FOR UPDATE`, [publicationId, expectedHash]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ code: 'ALREADY_IMPORTED', publicationId, status: existing.rows[0].status }, { status: 409 });
    }

    const groups = new Map();
    for (const item of items) {
      if (!item || !['lesson', 'mcq'].includes(item.kind) || !item.content_id || !item.topic_id || !item.payload) {
        throw new Error('INVALID_ITEM');
      }
      if (!(await canActOnTopic(admin, PERMISSIONS.CONTENT_CREATE, item.topic_id)) ) throw new Error(`FORBIDDEN_TOPIC:${item.topic_id}`);
      if (!groups.has(item.topic_id)) groups.set(item.topic_id, { questions: [], lessons: [] });
      groups.get(item.topic_id)[item.kind === 'mcq' ? 'questions' : 'lessons'].push(item);
    }

    const publication = await client.query(
      `INSERT INTO content_engine_publication(publication_id,manifest_hash,item_count,status,created_by) VALUES($1,$2,$3,'IMPORTED',$4) RETURNING publication_id`,
      [publicationId, expectedHash, items.length, admin.accountId ?? null]
    );

    const batchIds = [];
    for (const [topicId, group] of groups) {
      const questionIds = [];
      const lessonIds = [];

      for (const item of group.lessons) {
        const p = item.payload;
        const lessonId = String(item.content_id);
        const duplicate = await client.query(`SELECT id FROM content_engine_lesson_staging WHERE id=$1`, [lessonId]);
        if (duplicate.rows.length) throw new Error(`DUPLICATE_LESSON:${lessonId}`);
        await client.query(
          `INSERT INTO content_engine_lesson_staging(id,topic_id,title,concept,definition,explanation,examples,revision_notes,source_ids,engine_version,publication_id,status)
           VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,'PENDING')`,
          [lessonId, topicId, String(p.title || ''), String(p.concept || ''), String(p.definition || ''), String(p.explanation || ''),
           JSON.stringify(Array.isArray(p.examples) ? p.examples : []), JSON.stringify(Array.isArray(p.revisionNotes) ? p.revisionNotes : []),
           JSON.stringify(Array.isArray(p.sourceIds) ? p.sourceIds : []), Number.isInteger(p.version) ? p.version : 1, publicationId]
        );
        lessonIds.push(lessonId);
      }

      for (const item of group.questions) {
        const p = item.payload;
        if (!Array.isArray(p.options) || p.options.length < 2 || !Number.isInteger(p.answerIndex) || p.answerIndex < 0 || p.answerIndex >= p.options.length) throw new Error(`INVALID_MCQ:${item.content_id}`);
        if (new Set(p.options.map(String)).size !== p.options.length) throw new Error(`DUPLICATE_OPTIONS:${item.content_id}`);
        if (!p.question || !p.explanation || !Array.isArray(p.sourceIds) || !p.sourceIds.length) throw new Error(`MISSING_PROVENANCE:${item.content_id}`);
        const id = String(item.content_id);
        const duplicate = await client.query(`SELECT id FROM question WHERE id=$1 OR (language='en' AND normalized_hash=$2)`, [id, normalizedHash(p.question)]);
        if (duplicate.rows.length) throw new Error(`DUPLICATE_MCQ:${id}`);
        const difficulty = DIFFICULTY[p.difficulty] ?? null;
        if (difficulty === null) throw new Error(`INVALID_DIFFICULTY:${id}`);
        await client.query(
          `INSERT INTO question(id,topic_id,language,prompt,options,answer_index,explanation,trap,difficulty,estimated_seconds,source,source_year,status,normalized_hash,generation_source)
           VALUES($1,$2,'en',$3,$4::jsonb,$5,$6,NULL,$7,45,$8,NULL,'DRAFT',$9,'ai')`,
          [id, topicId, String(p.question), JSON.stringify(p.options), p.answerIndex, String(p.explanation), difficulty, `content-engine:${publicationId}`, normalizedHash(p.question)]
        );
        questionIds.push(id);
      }

      const batch = await client.query(
        `INSERT INTO content_review_batch(topic_id,generation_source,question_ids,resource_ids,lesson_ids,status)
         VALUES($1,'ai',$2::jsonb,'[]'::jsonb,$3::jsonb,'PENDING') RETURNING id`,
        [topicId, JSON.stringify(questionIds), JSON.stringify(lessonIds)]
      );
      batchIds.push(batch.rows[0].id);
    }

    await client.query('COMMIT');
    return NextResponse.json({ ok: true, publicationId, manifestHash: expectedHash, importedItems: items.length, reviewBatchIds: batchIds, status: publication.rows[0].publication_id ? 'IMPORTED_PENDING_REVIEW' : 'IMPORTED' }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Import failed';
    const code = message.startsWith('FORBIDDEN_TOPIC:') ? 'FORBIDDEN_TOPIC' : message.startsWith('DUPLICATE_') ? 'DUPLICATE_CONTENT' : message.startsWith('INVALID_') || message.startsWith('MISSING_') ? 'INVALID_CONTENT' : 'IMPORT_FAILED';
    return NextResponse.json({ code, message }, { status: code === 'FORBIDDEN_TOPIC' ? 403 : 400 });
  } finally { client.release(); }
}
