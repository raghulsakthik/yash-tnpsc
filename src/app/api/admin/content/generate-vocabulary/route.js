import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { generateVocabularyContent, VocabularyGenerationError } from '../../../../../lib/vocabularyGenerator.mjs';
import { createTopicIfMissing, upsertQuestions, upsertResource, ContentUploadError } from '../../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

const VOCAB_TOPIC_ID = 'en.vocabulary-general';
const VOCAB_TOPIC_NAME = 'General Vocabulary';
const VOCAB_CHAPTER_ID = 'en.vocabulary';

/**
 * POST /api/admin/content/generate-vocabulary
 * body: { words: string[] }
 *
 * The one place in this app that calls an external open-source API
 * (dictionaryapi.dev, free and keyless) to grow content, rather than
 * requiring an admin to author it or an AI call to invent it -- English
 * vocabulary had zero content anywhere in the bank otherwise. Every
 * question option is a real dictionary definition.
 */
export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const words = Array.isArray(body.words) ? body.words : [];

  try {
    const { questions, resource, skipped } = await generateVocabularyContent(words);

    await createTopicIfMissing({
      topicId: VOCAB_TOPIC_ID,
      topicName: VOCAB_TOPIC_NAME,
      chapterId: VOCAB_CHAPTER_ID,
    });

    const { inserted, updated } = await upsertQuestions({
      topic: VOCAB_TOPIC_ID,
      language: 'en',
      source: 'dictionaryapi.dev',
      questions,
    });

    await upsertResource({ topicId: VOCAB_TOPIC_ID, title: resource.title, body: resource.body, source: 'dictionaryapi.dev' });

    return NextResponse.json({ topicId: VOCAB_TOPIC_ID, inserted, updated, skipped });
  } catch (err) {
    if (err instanceof VocabularyGenerationError || err instanceof ContentUploadError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'GENERATE_FAILED', message: err.message }, { status: 500 });
  }
}
