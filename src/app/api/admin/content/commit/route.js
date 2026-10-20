import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { createTopicIfMissing, upsertQuestions, upsertResource, ContentUploadError } from '../../../../../lib/adminContent.mjs';
import { validateQuestion } from '../../../../../lib/contentValidation.mjs';
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
  const admin = await requireAdmin(request);
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
  const source = sourceYear ? `tnpsc-${sourceYear}` : 'admin-upload-pdf';

  if (mcqs.length === 0 && resources.length === 0) {
    return NextResponse.json({ code: 'NOTHING_TO_COMMIT', message: 'No approved questions or resources were included.' }, { status: 400 });
  }

  try {
    for (const t of newTopics) {
      if (!t.topicId || !t.topicName || !t.chapterId) {
        throw new ContentUploadError('MISSING_TOPIC_FIELDS', 'Each new topic needs topicId, topicName and chapterId');
      }
      await createTopicIfMissing(t);
    }

    const { rows: hashRows } = await query(`SELECT normalized_hash FROM question WHERE language = 'en'`);
    const existingHashes = new Set(hashRows.map((r) => r.normalized_hash));

    const byTopic = new Map();
    for (const q of mcqs) {
      if (!q.topicId) throw new ContentUploadError('MISSING_TOPIC_ID', 'Every MCQ must have a final topicId before committing.');
      if (!byTopic.has(q.topicId)) byTopic.set(q.topicId, []);
      const hash = crypto.createHash('sha256').update(String(q.question)).digest('hex').slice(0, 16);
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
      byTopic.get(q.topicId).push({
        id: sourceYear ? `tnpsc-${sourceYear}-${hash}` : `pdf-${hash}`,
        question: q.question,
        options: q.options,
        answer: q.answerIndex,
        explanation: q.explanation,
        trap: q.trap ?? null,
        imageData: q.diagramImage ?? null,
        year: sourceYear,
        qualityScore: score,
      });
    }

    let insertedQuestions = 0;
    let updatedQuestions = 0;
    const batchIds = [];
    for (const [topicId, questions] of byTopic) {
      const result = await upsertQuestions({
        topic: topicId,
        language: 'en',
        source,
        questions,
        status: 'DRAFT',
        generationSource: 'pdf',
      });
      insertedQuestions += result.inserted;
      updatedQuestions += result.updated;

      const avgQualityScore = questions.reduce((s, q) => s + q.qualityScore, 0) / questions.length;
      const batchId = await createReviewBatch({
        topicId,
        generationSource: 'pdf',
        questionIds: result.questionIds,
        avgQualityScore: Math.round(avgQualityScore * 1000) / 1000,
      });
      batchIds.push(batchId);
    }

    let resourcesAdded = 0;
    for (const r of resources) {
      if (!r.topicId) throw new ContentUploadError('MISSING_TOPIC_ID', 'Every resource must have a final topicId before committing.');
      await upsertResource({ topicId: r.topicId, title: r.title, body: r.body, source: 'admin-upload-pdf', imageData: r.diagramImage ?? null });
      resourcesAdded += 1;
    }

    return NextResponse.json({
      topicsCreated: newTopics.length,
      insertedQuestions,
      updatedQuestions,
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
