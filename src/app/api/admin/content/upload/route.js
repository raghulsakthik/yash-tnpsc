import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { parseQuestionYaml, createTopic, upsertQuestions, ContentUploadError } from '../../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/upload
 * body: {
 *   yaml: string,              -- same shape as content/questions/*.yaml
 *   newTopic?: {               -- omit to upload into an existing topic
 *     topicId, topicName,
 *     chapterId, chapterName?, subjectId?   -- chapterName+subjectId only needed if chapterId doesn't exist yet
 *   }
 * }
 *
 * The manual, token-free path for growing the question bank: an admin
 * authors or pastes a YAML batch exactly like a developer would, this
 * upserts it straight into the live database. No AI call, no Claude
 * session -- this is the thing that replaces needing one for routine
 * content growth.
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

  if (!body.yaml || typeof body.yaml !== 'string') {
    return NextResponse.json({ code: 'MISSING_YAML', message: 'A `yaml` field with the content text is required' }, { status: 400 });
  }

  try {
    const doc = parseQuestionYaml(body.yaml);

    if (body.newTopic) {
      const { topicId, topicName, chapterId, chapterName, subjectId } = body.newTopic;
      if (!topicId || !topicName || !chapterId) {
        return NextResponse.json({ code: 'MISSING_TOPIC_FIELDS', message: 'newTopic needs topicId, topicName and chapterId' }, { status: 400 });
      }
      if (doc.topic !== topicId) {
        return NextResponse.json(
          { code: 'TOPIC_MISMATCH', message: `The YAML's topic (${doc.topic}) must match newTopic.topicId (${topicId})` },
          { status: 400 }
        );
      }
      await createTopic({ topicId, topicName, chapterId, chapterName, subjectId });
    }

    const result = await upsertQuestions(doc);

    return NextResponse.json({
      topic: doc.topic,
      createdTopic: Boolean(body.newTopic),
      questionCount: doc.questions.length,
      ...result,
    });
  } catch (err) {
    if (err instanceof ContentUploadError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'UPLOAD_FAILED', message: err.message }, { status: 500 });
  }
}
