import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyContent, ClassifyError } from '../src/lib/ai/contentClassifier.mjs';

test('rejects oversized single-paragraph uploads instead of sending one unbounded model request', async () => {
  const pages = [{ pageNumber: 1, text: 'A '.repeat(1_000_000) }];
  await assert.rejects(
    classifyContent(pages, []),
    (error) => error instanceof ClassifyError
      && error.code === 'DOCUMENT_TOO_LARGE'
      && /No partial content was processed/.test(error.message),
  );
});

test('processes every chunk of a multi-page large upload and preserves unanswered MCQs', async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GEMINI_API_KEY;
  const calls = [];
  process.env.GEMINI_API_KEY = 'test-key';
  globalThis.fetch = async (_url, options) => {
    const payload = JSON.parse(options.body);
    const promptText = payload.contents[0].parts[0].text;
    const pageNumber = Number(promptText.match(/=== PAGE ([0-9]+) ===/)?.[1]);
    calls.push(pageNumber);
    const candidate = {
      question: `Question extracted from page ${pageNumber}?`,
      questionNumber: 1,
      options: ['First option', 'Second option', 'Third option', 'Fourth option'],
      answerIndex: null,
      explanation: 'The source contains no answer key; a reviewer must verify the correct option.',
      trap: null,
      needsDiagram: false,
      sourcePage: pageNumber,
      topicId: 'topic.one',
      isNewTopic: false,
      newTopicName: null,
      newChapterId: null,
      confidence: 0.95,
    };
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ mcqs: [candidate], resources: [] }) }] } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const syllabus = [{ id: 'subject.one', name: 'Subject', chapters: [{ id: 'chapter.one', name: 'Chapter', topics: [{ id: 'topic.one', name: 'Topic' }] }] }];
    const result = await classifyContent([
      { pageNumber: 1, text: 'A'.repeat(45_000) },
      { pageNumber: 2, text: 'B'.repeat(45_000) },
    ], syllabus);
    assert.equal(result.chunkCount, 2);
    assert.equal(result.truncated, false);
    assert.deepEqual(calls.sort(), [1, 2]);
    assert.deepEqual(result.mcqs.map((item) => item.sourcePage).sort(), [1, 2]);
    assert.ok(result.mcqs.every((item) => item.answerIndex === null));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

 test('rejects documents above the safe chunk limit rather than silently truncating the tail', async () => {
  const pages = Array.from({ length: 41 }, (_, index) => ({
    pageNumber: index + 1,
    text: 'A'.repeat(45_001),
  }));
  await assert.rejects(
    classifyContent(pages, []),
    (error) => error instanceof ClassifyError && error.code === 'DOCUMENT_TOO_LARGE',
  );
});
