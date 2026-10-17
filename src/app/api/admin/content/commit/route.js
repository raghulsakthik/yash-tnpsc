import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { createTopicIfMissing, upsertQuestions, upsertResource, ContentUploadError } from '../../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/commit
 * body: {
 *   newTopics?: [{ topicId, topicName, chapterId, chapterName?, subjectId? }],
 *   mcqs?: [{ topicId, question, options, answerIndex, explanation, trap? }],
 *   resources?: [{ topicId, title, body }],
 * }
 *
 * Writes the admin-reviewed result of a PDF classify pass. The UI has
 * already resolved every item to a final topicId -- either one of the
 * existing syllabus topics, or one of `newTopics` this same request is
 * creating. This route just creates those topics (if missing) and upserts
 * the questions/resources against them, same as the manual YAML path.
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

    const byTopic = new Map();
    for (const q of mcqs) {
      if (!q.topicId) throw new ContentUploadError('MISSING_TOPIC_ID', 'Every MCQ must have a final topicId before committing.');
      if (!byTopic.has(q.topicId)) byTopic.set(q.topicId, []);
      const hash = crypto.createHash('sha256').update(String(q.question)).digest('hex').slice(0, 16);
      byTopic.get(q.topicId).push({
        id: `pdf-${hash}`,
        question: q.question,
        options: q.options,
        answer: q.answerIndex,
        explanation: q.explanation,
        trap: q.trap ?? null,
        imageData: q.diagramImage ?? null,
      });
    }

    let insertedQuestions = 0;
    let updatedQuestions = 0;
    for (const [topicId, questions] of byTopic) {
      const result = await upsertQuestions({ topic: topicId, language: 'en', source: 'admin-upload-pdf', questions });
      insertedQuestions += result.inserted;
      updatedQuestions += result.updated;
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
    });
  } catch (err) {
    if (err instanceof ContentUploadError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'COMMIT_FAILED', message: err.message }, { status: 500 });
  }
}
