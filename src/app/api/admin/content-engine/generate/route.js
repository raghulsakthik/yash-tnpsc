import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db.mjs';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../lib/permissions.mjs';
import { contentEngineManifestHash } from '../../../../../lib/contentEngineManifest.mjs';
import { generateTopicPackage, LessonGenerationError } from '../../../../../lib/aiLessonGenerator.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_READ) || await requirePermission(request, PERMISSIONS.AI_GENERATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Content read permission required' }, { status: 403 });
  try {
    const { rows } = await query(`
      SELECT t.id AS "topicId", t.name AS "topicName", c.name AS "chapterName", s.name AS "subjectName",
             COUNT(DISTINCT l.resource_id)::int AS "approvedSourceCount"
        FROM topic t
        JOIN chapter c ON c.id=t.chapter_id
        JOIN subject s ON s.id=c.subject_id
        LEFT JOIN topic_resource r ON r.topic_id=t.id AND r.status='PUBLISHED'
          AND COALESCE(r.source,'') NOT ILIKE '%pyq%'
        LEFT JOIN content_lineage l ON l.resource_id=r.id
          AND l.source_year IS NULL AND l.exam_code IS NULL AND l.exam_group IS NULL AND l.paper IS NULL
          AND COALESCE(l.source_file_name,'') !~* '(pyq|previous[ _-]?year|question[ _-]?(paper|booklet))'
       GROUP BY t.id,t.name,c.name,s.name
       ORDER BY s.sort_order,c.sort_order,t.sort_order,t.name
    `);
    return NextResponse.json({ topics: rows });
  } catch (error) {
    return NextResponse.json({ code: 'TOPIC_LIST_FAILED', message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.AI_GENERATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'AI generation permission required' }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 }); }
  const topicId = typeof body.topicId === 'string' ? body.topicId.trim() : '';
  const mcqCount = Number.isInteger(body.mcqCount) ? body.mcqCount : 5;
  if (!topicId) return NextResponse.json({ code: 'TOPIC_REQUIRED', message: 'Select a syllabus topic.' }, { status: 400 });
  if (mcqCount < 3 || mcqCount > 10) return NextResponse.json({ code: 'INVALID_MCQ_COUNT', message: 'MCQ count must be between 3 and 10.' }, { status: 400 });

  try {
    const { rows: topics } = await query(`
      SELECT t.id,t.name,c.name AS chapter_name,s.name AS subject_name
        FROM topic t JOIN chapter c ON c.id=t.chapter_id JOIN subject s ON s.id=c.subject_id
       WHERE t.id=$1
    `, [topicId]);
    if (!topics.length) return NextResponse.json({ code: 'TOPIC_NOT_FOUND', message: 'Topic is not in the syllabus tree.' }, { status: 404 });
    const { rows: sources } = await query(`
      SELECT r.id::text AS id,r.title,r.body,r.source,l.source_file_name,l.source_page
        FROM topic_resource r
        JOIN content_lineage l ON l.resource_id=r.id
       WHERE r.topic_id=$1 AND r.status='PUBLISHED'
         AND COALESCE(r.source,'') NOT ILIKE '%pyq%'
         AND l.source_year IS NULL AND l.exam_code IS NULL AND l.exam_group IS NULL AND l.paper IS NULL
         AND COALESCE(l.source_file_name,'') !~* '(pyq|previous[ _-]?year|question[ _-]?(paper|booklet))'
       ORDER BY r.created_at DESC
       LIMIT 12
    `, [topicId]);
    if (!sources.length) return NextResponse.json({ code: 'NO_APPROVED_EVIDENCE', message: 'No approved non-PYQ source material is mapped to this topic yet. Review and approve relevant study resources first.' }, { status: 409 });
    const evidence = sources.map((source) => ({
      id: source.id,
      title: source.title,
      source: source.source_file_name || source.source || 'approved study material',
      body: String(source.body || '').slice(0, 9000),
      page: source.source_page ?? null,
    })).filter((source) => source.body.length >= 80);
    if (!evidence.length) return NextResponse.json({ code: 'NO_SUBSTANTIVE_EVIDENCE', message: 'Approved resources exist, but none contains enough extracted text for safe generation.' }, { status: 409 });
    const generated = await generateTopicPackage({ topic: topics[0], evidence, mcqCount });
    const publication = generated.publication;
    const manifestHash = contentEngineManifestHash(publication.publicationId, publication.items);
    return NextResponse.json({
      ok: true,
      topic: { id: topics[0].id, name: topics[0].name, chapter: topics[0].chapter_name, subject: topics[0].subject_name },
      package: { publicationId: publication.publicationId, manifestHash, items: publication.items },
      quality: generated.quality,
      nextStep: 'Import this package into the admin review queue. Nothing has been published.',
    });
  } catch (error) {
    if (error instanceof LessonGenerationError) return NextResponse.json({ code: error.code, message: error.message, issues: error.issues ?? [] }, { status: error.code === 'AI_PROVIDER_NOT_CONFIGURED' ? 503 : 422 });
    return NextResponse.json({ code: 'GENERATION_FAILED', message: error.message }, { status: 500 });
  }
}
