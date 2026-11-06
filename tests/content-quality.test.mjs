import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateClassifiedContent } from '../src/lib/contentQuality.mjs';
import { validateQuestion } from '../src/lib/contentValidation.mjs';

const syllabusTree = [{
  id: 'general-studies',
  chapters: [{ id: 'polity', topics: [{ id: 'polity.constitution', name: 'Constitution' }] }],
}];

test('commit quality gate rejects answerless candidates before the database constraint', () => {
  const result = validateQuestion({
    prompt: 'Which part introduces the Constitution?',
    options: ['Directive Principles', 'Preamble', 'Fundamental Duties', 'Schedules'],
    answerIndex: null,
    explanation: 'The source does not provide an answer key.',
    difficulty: 0.3,
    estimatedSeconds: 45,
    topicExists: true,
  }, new Set());
  assert.equal(result.passed, false);
  assert.equal(result.breakdown.correctness, 0);
});

test('keeps extracted MCQs in review and verifies only an explicit source key', () => {
  const pages = [{ pageNumber: 1, text: 'The Constitution of India has a Preamble. Question: What introduces the Constitution?\nAnswer: B' }];
  const result = evaluateClassifiedContent({
    pages,
    syllabusTree,
    result: {
      mcqs: [{
        question: 'What introduces the Constitution?',
        options: ['Directive Principles', 'Preamble', 'Fundamental Duties', 'Schedules'],
        answerIndex: 1,
        explanation: 'The Preamble introduces the Constitution and states its guiding ideals.',
        topicId: 'polity.constitution',
        sourcePage: 1,
        confidence: 0.95,
      }],
      resources: [],
    },
  });
  assert.equal(result.mcqs[0].quality.answerVerification, 'SOURCE_KEY_MATCH');
  assert.equal(result.mcqs[0].quality.status, 'REVIEW_REQUIRED');
  assert.equal(result.mcqs[0].quality.publishable, false);
  assert.equal(result.qualitySummary.autoPublished, 0);
});

test('flags inferred answers when the source has no answer key', () => {
  const result = evaluateClassifiedContent({
    pages: [{ pageNumber: 1, text: 'The Constitution of India has a Preamble. What introduces the Constitution?' }],
    syllabusTree,
    result: { mcqs: [{
      question: 'What introduces the Constitution?',
      options: ['Directive Principles', 'Preamble', 'Fundamental Duties', 'Schedules'],
      answerIndex: 1,
      explanation: 'The Preamble introduces the Constitution and states its guiding ideals.',
      topicId: 'polity.constitution',
      sourcePage: 1,
      confidence: 0.95,
    }], resources: [] },
  });
  assert.equal(result.mcqs[0].quality.answerVerification, 'HUMAN_VERIFICATION_REQUIRED');
  assert.ok(result.mcqs[0].quality.issues.includes('NO_SOURCE_ANSWER_KEY'));
});

test('keeps answerless MCQs as review candidates instead of discarding or auto-solving them', () => {
  const result = evaluateClassifiedContent({
    pages: [{ pageNumber: 1, text: 'The Constitution has a Preamble. Which part introduces the Constitution?' }],
    syllabusTree,
    result: { mcqs: [{
      question: 'Which part introduces the Constitution?',
      options: ['Directive Principles', 'Preamble', 'Fundamental Duties', 'Schedules'],
      answerIndex: null,
      explanation: 'The source provides the question and options but does not include an answer key.',
      topicId: 'polity.constitution',
      sourcePage: 1,
      confidence: 0.95,
    }], resources: [] },
  });
  assert.equal(result.mcqs.length, 1);
  assert.equal(result.mcqs[0].answerIndex, null);
  assert.equal(result.mcqs[0].quality.status, 'REVIEW_REQUIRED');
  assert.ok(result.mcqs[0].quality.issues.includes('ANSWER_INDEX_MISSING'));
  assert.ok(result.mcqs[0].quality.issues.includes('NO_SOURCE_ANSWER_KEY'));
  assert.equal(result.mcqs[0].quality.publishable, false);
});

 test('blocks unknown topics and invalid source page references', () => {
  const result = evaluateClassifiedContent({
    pages: [{ pageNumber: 1, text: 'Question text from source.' }],
    syllabusTree,
    result: { mcqs: [{
      question: 'Question text from source?',
      options: ['A', 'B'],
      answerIndex: 0,
      explanation: 'This is an explanation that is long enough.',
      topicId: 'made.up.topic',
      sourcePage: 2,
      confidence: 0.99,
    }], resources: [] },
  });
  assert.equal(result.mcqs[0].quality.status, 'BLOCKED');
  assert.ok(result.mcqs[0].quality.issues.includes('TOPIC_NOT_CONFIRMED'));
  assert.ok(result.mcqs[0].quality.issues.includes('SOURCE_PAGE_NOT_CONFIRMED'));
});

test('study resources require a real topic, source page and substantive body', () => {
  const result = evaluateClassifiedContent({
    pages: [{ pageNumber: 1, text: 'A detailed explanation about the Indian Constitution and its important features.' }],
    syllabusTree,
    result: { mcqs: [], resources: [{
      title: 'Constitution basics',
      body: 'Short',
      topicId: 'polity.constitution',
      sourcePage: 1,
      confidence: 0.95,
    }] },
  });
  assert.equal(result.resources[0].quality.status, 'BLOCKED');
  assert.ok(result.resources[0].quality.issues.includes('RESOURCE_TOO_SHORT'));
});


test('does not assign a page-level answer marker to one question when multiple questions share the page', () => {
  const page = { pageNumber: 1, text: 'The Constitution has a Preamble.\nQuestion one asks about the Preamble.\nAnswer: B\nQuestion two asks about the legislature.' };
  const base = {
    options: ['Directive Principles', 'Preamble', 'Fundamental Duties', 'Schedules'],
    answerIndex: 1,
    explanation: 'This explanation is long enough for the quality gate.',
    topicId: 'polity.constitution',
    sourcePage: 1,
    confidence: 0.95,
  };
  const result = evaluateClassifiedContent({
    pages: [page],
    syllabusTree,
    result: { mcqs: [
      { ...base, question: 'Question one asks about the Preamble?' },
      { ...base, question: 'Question two asks about the legislature?' },
    ], resources: [] },
  });
  assert.equal(result.mcqs[0].quality.answerVerification, 'HUMAN_VERIFICATION_REQUIRED');
  assert.equal(result.mcqs[1].quality.answerVerification, 'HUMAN_VERIFICATION_REQUIRED');
});
