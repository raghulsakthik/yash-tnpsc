import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAiResponse, evaluateAiResponseBatch } from '../src/domain/aiEvaluation.mjs';

const realTopicIds = new Set(['aptitude.percentage']);

test('a real, on-topic, curriculum-aligned response passes', () => {
  const result = evaluateAiResponse(
    { response: 'Percentage of a number means dividing by 100 and multiplying.', expectedExplanation: 'percentage dividing multiplying', questionPrompt: 'percentage of a number', topicId: 'aptitude.percentage' },
    realTopicIds
  );
  assert.equal(result.pass, true);
  assert.equal(result.curriculumAlignment, true);
});

test('a response about a topic id outside the real syllabus fails curriculum alignment', () => {
  const result = evaluateAiResponse({ response: 'A fine explanation of something.', topicId: 'not.a.real.topic', questionPrompt: null, expectedExplanation: null }, realTopicIds);
  assert.equal(result.curriculumAlignment, false);
  assert.equal(result.pass, false);
});

test('a response that overreaches into claiming authority over mastery fails, with a real hallucination flag', () => {
  const result = evaluateAiResponse({ response: 'Your mastery is now 95% — great job!', topicId: 'aptitude.percentage', questionPrompt: null, expectedExplanation: null }, realTopicIds);
  assert.equal(result.hallucinationRisk, 1);
  assert.equal(result.pass, false);
});

test('a completely off-topic response fails relevance, never silently passing', () => {
  const result = evaluateAiResponse({ response: 'Elephants are large mammals native to Africa and Asia.', questionPrompt: 'What is 25% of 80?', expectedExplanation: null, topicId: null }, realTopicIds);
  assert.equal(result.pass, false);
});

test('batch evaluation reports a real pass rate and an honest null average correctness with no expected text', () => {
  const batch = evaluateAiResponseBatch(
    [{ response: 'A real, useful explanation of the method here.', topicId: 'aptitude.percentage', questionPrompt: null, expectedExplanation: null }],
    realTopicIds
  );
  assert.equal(batch.totalItems, 1);
  assert.equal(batch.averageCorrectness, null);
  assert.equal(batch.passRate, 1);
});

test('an empty batch reports an honest null pass rate, not zero or NaN', () => {
  const batch = evaluateAiResponseBatch([], realTopicIds);
  assert.equal(batch.passRate, null);
  assert.equal(batch.hallucinationRate, 0);
});
