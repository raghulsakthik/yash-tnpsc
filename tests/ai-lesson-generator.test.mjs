import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGeneratedContent, generateTopicPackage, LessonGenerationError } from '../src/lib/aiLessonGenerator.mjs';

const evidence = [{ id: 'resource-1', body: 'The Constitution of India came into effect on 26 January 1950. It establishes the framework for governance and fundamental rights.' }];
const valid = {
  lesson: {
    title: 'Constitution basics',
    concept: 'A constitution establishes the basic framework and rules through which a country is governed. It describes institutions, powers and limits.',
    definition: 'A constitution is the foundational set of rules for governing a state.',
    explanation: 'The Constitution sets out the structure of government, its powers and the rights of citizens. It provides the framework within which laws and institutions operate.',
    examples: [{ problem: 'When did the Constitution come into effect?', steps: ['Read the date in the source.', 'Match the date to the question.'], answer: '26 January 1950' }],
    revisionNotes: ['The Constitution provides a framework for governance.', 'It came into effect on 26 January 1950.'],
    sourceIds: ['resource-1'],
  },
  mcqs: [{
    question: 'On which date did the Constitution of India come into effect?',
    options: ['15 August 1947', '26 January 1950', '26 November 1949', '2 October 1950'],
    answerIndex: 1,
    explanation: 'The source explicitly states the commencement date as 26 January 1950.',
    difficulty: 'easy',
    sourceIds: ['resource-1'],
    answerEvidence: { sourceId: 'resource-1', quote: 'The Constitution of India came into effect on 26 January 1950.' },
  }],
};

test('accepts complete source-grounded content with exact answer evidence', () => {
  assert.deepEqual(validateGeneratedContent(valid, evidence, 1), { valid: true, issues: [] });
});

test('rejects unsupported or paraphrased answer evidence', () => {
  const output = structuredClone(valid);
  output.mcqs[0].answerEvidence.quote = 'It started in January 1950.';
  assert.ok(validateGeneratedContent(output, evidence, 1).issues.includes('MCQ_1_ANSWER_EVIDENCE_NOT_FOUND'));
});

test('rejects duplicate options and untraceable source IDs', () => {
  const output = structuredClone(valid);
  output.mcqs[0].options[3] = output.mcqs[0].options[0];
  output.mcqs[0].sourceIds = ['unknown-source'];
  const result = validateGeneratedContent(output, evidence, 1);
  assert.ok(result.issues.includes('MCQ_1_INVALID'));
  assert.ok(result.issues.includes('MCQ_1_SOURCE_IDS_INVALID'));
});

test('requires exact requested MCQ count and lesson evidence', () => {
  const output = structuredClone(valid);
  output.lesson.sourceIds = [];
  assert.ok(validateGeneratedContent(output, evidence, 2).issues.includes('MCQ_COUNT_MISMATCH'));
  assert.ok(validateGeneratedContent(output, evidence, 1).issues.includes('LESSON_SOURCE_IDS_INVALID'));
});

test('fails closed when the Gemini provider key is not configured', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(
      generateTopicPackage({ topic: { id: 'topic-1', name: 'Topic' }, evidence, mcqCount: 3 }),
      (error) => error instanceof LessonGenerationError && error.code === 'AI_PROVIDER_NOT_CONFIGURED',
    );
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test('refuses to generate when no approved source evidence is supplied', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-placeholder';
  try {
    await assert.rejects(
      generateTopicPackage({ topic: { id: 'topic-1', name: 'Topic' }, evidence: [], mcqCount: 3 }),
      (error) => error instanceof LessonGenerationError && error.code === 'NO_APPROVED_EVIDENCE',
    );
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test('creates a source-linked review-only package and never auto-publishes generated content', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-placeholder';
  const sourceId = '11111111-1111-4111-8111-111111111111';
  const packageEvidence = [{ ...evidence[0], id: sourceId, title: 'TNPSC approved notes', source: 'polity-notes.pdf', page: 4 }];
  const output = structuredClone(valid);
  output.lesson.sourceIds = [sourceId];
  output.mcqs[0].sourceIds = [sourceId];
  output.mcqs[0].answerEvidence.sourceId = sourceId;
  let prompt;
  try {
    const result = await generateTopicPackage({
      topic: { id: 'tnpsc.polity.constitution', name: 'Constitution basics', subject_name: 'Indian Polity', chapter_name: 'Constitution' },
      evidence: packageEvidence,
      mcqCount: 1,
      generateJsonFn: async (value) => { prompt = value; return output; },
    });
    assert.match(prompt.user, /APPROVED SOURCE EXCERPTS/);
    assert.match(prompt.system, /verbatim answerEvidence quote/);
    assert.equal(result.publication.items.length, 2);
    assert.equal(result.publication.items[0].kind, 'lesson');
    assert.equal(result.publication.items[0].topic_id, 'tnpsc.polity.constitution');
    assert.deepEqual(result.publication.items[0].payload.sourceIds, [sourceId]);
    assert.equal(result.publication.items[1].kind, 'mcq');
    assert.equal(result.publication.items[1].topic_id, 'tnpsc.polity.constitution');
    assert.match(result.publication.items[1].payload.explanation, /independently verify before approval/);
    assert.equal(result.quality.status, 'REVIEW_REQUIRED');
    assert.equal(result.quality.answerVerification, 'UNVERIFIED_HUMAN_CHECK_REQUIRED');
    assert.equal(result.quality.autoPublished, 0);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test('does not stage a package when the provider is unavailable or output fails validation', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-placeholder';
  try {
    await assert.rejects(
      generateTopicPackage({ topic: { id: 'topic-1', name: 'Topic' }, evidence, mcqCount: 1, generateJsonFn: async () => null }),
      (error) => error instanceof LessonGenerationError && error.code === 'AI_GENERATION_UNAVAILABLE',
    );
    const invalid = structuredClone(valid);
    invalid.mcqs[0].answerEvidence.quote = 'This quote is not in the source text.';
    await assert.rejects(
      generateTopicPackage({ topic: { id: 'topic-1', name: 'Topic' }, evidence, mcqCount: 1, generateJsonFn: async () => invalid }),
      (error) => error instanceof LessonGenerationError && error.code === 'AI_OUTPUT_FAILED_VALIDATION' && error.issues.includes('MCQ_1_ANSWER_EVIDENCE_NOT_FOUND'),
    );
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});
