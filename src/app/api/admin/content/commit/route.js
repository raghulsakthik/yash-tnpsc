import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS, canActOnTopic, canActOnSubject } from '../../../../../lib/permissions.mjs';
import { createTopicIfMissing, upsertQuestions, upsertResource, ContentUploadError } from '../../../../../lib/adminContent.mjs';
import { validateQuestion, normalizedHash } from '../../../../../lib/contentValidation.mjs';
import { createReviewBatch } from '../../../../../lib/contentReview.mjs';
import { query } from '../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/commit
 * body: {
 *   newTopics?: [{ topicId, topicName, chapterId, chapterName?, subjectId? }],
 *   mcqs?: [{ topicId, question, options, answerIndex, explanation, trap? }],
 *   resources?: [{ topicId, title, body }],
 *   sourceYear?: number,  -- set when the uploaded document is a previous-year
 *                             paper; tags every committed question with that
 *                             year (question.source_year) and source
 *                             ('tnpsc-<year>'), the same fields /api/pyqs/*
 *                             filters and groups by.
 * }
 *
 * Writes the admin-reviewed result of a PDF classify pass. The UI has
 * already resolved every item to a final topicId -- either one of the
 * existing syllabus topics, or one of `newTopics` this same request is
 * creating. This route creates those topics (if missing), then lands every
 * question as DRAFT behind a real review-queue batch (one per topic, same
 * shape /admin/review already shows for template/AI-generated content) --
 * an admin eyeballing the classify proposal before clicking Commit is not
 * the same as that content actually being published, and previously this
 * route wrote PUBLISHED directly with no queue state at all.
 */
export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const newTopics = Array.isArray(body.newTopics) ? body.newTopics : [];
  const mcqs = Array.isArray(body.mcqs) ? body.mcqs : [];
  const resources = Array.isArray(body.resources) ? body.resources : [];
  const sourceYear = Number.isInteger(body.sourceYear) && body.sourceYear >= 2000 && body.sourceYear <= 2100 ? body.sourceYear : null;
  const examCode = typeof body.examCode === 'string' && body.examCode.trim() ? body.examCode.trim() : (sourceYear ? 'TNPSC' : null);
  const examGroup = typeof body.examGroup === 'string' && body.examGroup.trim() ? body.examGroup.trim() : (sourceYear ? 'Group 2' : null);
  const paper = typeof body.paper === 'string' && body.paper.trim() ? body.paper.trim() : (sourceYear ? `TNPSC ${examGroup ?? 'Group 2'} ${sourceYear}` : null);
  const source = sourceYear ? `tnpsc-${sourceYear}` : 'admin-upload-pdf';
  const generationSource = sourceYear ? 'pyq' : 'pdf';

  if (mcqs.length === 0 && resources.length === 0) {
    return NextResponse.json({ code: 'NOTHING_TO_COMMIT', message: 'No approved questions or resources were included.' }, { status: 400 });
  }

  try {
    for (const t of newTopics) {
      if (!t.topicId || !t.topicName || !t.chapterId) {
        throw new ContentUploadError('MISSING_TOPIC_FIELDS', 'Each new topic needs topicId, topicName and chapterId');
      }
      if (!(await canActOnSubject(admin, PERMISSIONS.TOPIC_CREATE, t.subjectId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this new topic' }, { status: 403 });
      await createTopicIfMissing(t);
    }

    const { rows: hashRows } = await query(`SELECT normalized_hash FROM question WHERE language = 'en'`);
    const existingHashes = new Set(hashRows.map((r) => r.normalized_hash));
    let duplicatesSkipped = 0;

    const byTopic = new Map();
    for (const q of mcqs) {
      if (!q.topicId) throw new ContentUploadError('MISSING_TOPIC_ID', 'Every MCQ must have a final topicId before committing.');
      if (!byTopic.has(q.topicId)) byTopic.set(q.topicId, []);
      const hash = crypto.createHash('sha256').update(String(q.question)).digest('hex').slice(0, 16);
      const normalized = normalizedHash(q.question);
      if (existingHashes.has(normalized)) {
        duplicatesSkipped += 1;
        continue;
      }
      const { score } = validateQuestion(
        {
          prompt: q.question,
          options: q.options,
          answerIndex: q.answerIndex,
          explanation: q.explanation,
          difficulty: 0.3,
          estimatedSeconds: 45,
          topicExists: true,
        },
        existingHashes
      );
      existingHashes.add(normalized);
      byTopic.get(q.topicId).push({
        id: sourceYear ? `tnpsc-${sourceYear}-${hash}` : `pdf-${hash}`,
        question: q.question,
        options: q.options,
        answer: q.answerIndex,
        explanation: q.explanation,
        trap: q.trap ?? null,
        imageData: q.diagramImage ?? null,
        year: sourceYear,
        examCode,
        examGroup,
        paper,
        questionNumber: q.questionNumber ?? null,
        sourcePage: q.sourcePage ?? null,
        qualityScore: score,
      });
    }

    let insertedQuestions = 0;
    let updatedQuestions = 0;
    const batchIds = [];
    for (const [topicId, questions] of byTopic) {
      if (!(await canActOnTopic(admin, PERMISSIONS.CONTENT_CREATE, topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this topic' }, { status: 403 });
      const result = await upsertQuestions({
        topic: topicId,
        language: 'en',
        source,
        questions,
        status: 'DRAFT',
        generationSource,
      });
      insertedQuestions += result.inserted;
      updatedQuestions += result.updated;

      const avgQualityScore = questions.reduce((s, q) => s + q.qualityScore, 0) / questions.length;
      const batchId = await createReviewBatch({
        topicId,
        generationSource,
        questionIds: result.questionIds,
        avgQualityScore: Math.round(avgQualityScore * 1000) / 1000,
      });
      batchIds.push({ topicId, id: batchId });
    }

    let resourcesAdded = 0;
    const resourcesByTopic = new Map();
    const resourceReviewBatchByTopic = new Map();
    for (const r of resources) {
      if (!r.topicId) throw new ContentUploadError('MISSING_TOPIC_ID', 'Every resource must have a final topicId before committing.');
      if (!(await canActOnTopic(admin, PERMISSIONS.CONTENT_CREATE, r.topicId))) return NextResponse.json({ code: 'FORBIDDEN', message: 'Subject scope does not allow this resource topic' }, { status: 403 });
      const resourceId = await upsertResource({ topicId: r.topicId, title: r.title, body: r.body, source: 'admin-upload-pdf', imageData: r.diagramImage ?? null, status: 'DRAFT' });
      if (!resourcesByTopic.has(r.topicId)) resourcesByTopic.set(r.topicId, []);
      resourcesByTopic.get(r.topicId).push(resourceId);
      resourcesAdded += 1;
    }

    // Resources with no MCQs still need a review batch. Mixed batches keep
    // questions and study material for the same topic together, while the
    // reviewer can approve/reject both atomically.
    for (const [topicId, resourceIds] of resourcesByTopic) {
      if (byTopic.has(topicId)) {
        const existingBatch = batchIds.find((b) => b.topicId === topicId);
        if (existingBatch) {
          // The current batch API is intentionally one-shot; create a second
          // resource-only batch rather than mutating an already-created row.
          const resourceBatchId = await createReviewBatch({ topicId, generationSource, questionIds: [], resourceIds });
          batchIds.push({ topicId, id: resourceBatchId });
          resourceReviewBatchByTopic.set(topicId, resourceBatchId);
        }
      } else {
        const resourceBatchId = await createReviewBatch({ topicId, generationSource, questionIds: [], resourceIds });
        batchIds.push({ topicId, id: resourceBatchId });
        resourceReviewBatchByTopic.set(topicId, resourceBatchId);
      }
    }

    // Persist immutable provenance after the review batch exists. The topic/chapter/subject
    // snapshot is captured now so later syllabus renames/re-parenting do not erase where
    // the imported item originally landed.
    for (const [topicId, questions] of byTopic) {
      const batch = batchIds.find((b) => b.topicId === topicId && b.id);
      if (!batch) continue;
      const { rows: placement } = await query(`
        SELECT t.id AS topic_id, t.chapter_id, c.subject_id
          FROM topic t JOIN chapter c ON c.id = t.chapter_id WHERE t.id = $1`, [topicId]);
      const place = placement[0] ?? {};
      const questionIds = questions.map((q) => q.id);
      const { rows: questionRows } = await query(`
        SELECT id, normalized_hash, content_version FROM question WHERE id = ANY($1::text[])`, [questionIds]);
      for (const q of questionRows) {
        const original = questions.find((x) => x.id === q.id);
        await query(`
          INSERT INTO content_lineage
            (question_id, processing_batch_id, review_batch_id, source_file_name, source_page,
             source_question_number, source_year, exam_code, exam_group, paper, subject_id,
             chapter_id, topic_id, content_version, source_hash)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (question_id) WHERE question_id IS NOT NULL DO NOTHING`,
          [q.id, body.processingBatchId ?? null, batch.id, body.sourceFileName ?? paper, original?.sourcePage ?? null,
           original?.questionNumber ?? null, sourceYear, examCode, examGroup, paper, place.subject_id ?? null,
           place.chapter_id ?? null, topicId, q.content_version ?? 1, q.normalized_hash]
        );
      }
    }
    for (const [topicId, resourceIds] of resourcesByTopic) {
      const batch = resourceReviewBatchByTopic.get(topicId) ?? batchIds.find((b) => b.topicId === topicId)?.id ?? null;
      const { rows: placement } = await query(`
        SELECT t.id AS topic_id, t.chapter_id, c.subject_id
          FROM topic t JOIN chapter c ON c.id = t.chapter_id WHERE t.id = $1`, [topicId]);
      const place = placement[0] ?? {};
      for (const resourceId of resourceIds) {
        await query(`
          INSERT INTO content_lineage
            (resource_id, processing_batch_id, review_batch_id, source_file_name, source_page,
             source_year, exam_code, exam_group, paper, subject_id, chapter_id, topic_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (resource_id) WHERE resource_id IS NOT NULL DO NOTHING`,
          [resourceId, body.processingBatchId ?? null, batch, body.sourceFileName ?? paper,
           null, sourceYear, examCode, examGroup, paper, place.subject_id ?? null, place.chapter_id ?? null, topicId]
        );
      }
    }

    return NextResponse.json({
      topicsCreated: newTopics.length,
      insertedQuestions,
      updatedQuestions,
      duplicatesSkipped,
      resourcesAdded,
      reviewBatches: batchIds.length,
    });
  } catch (err) {
    if (err instanceof ContentUploadError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'COMMIT_FAILED', message: err.message }, { status: 500 });
  }
}
