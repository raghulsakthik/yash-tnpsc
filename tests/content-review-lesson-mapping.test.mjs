import test from 'node:test';
import assert from 'node:assert/strict';
import { mapStagedLessonToLiveFields } from '../src/lib/contentReview.mjs';

test('maps structured AI worked examples into the learner lesson schema', () => {
  const result = mapStagedLessonToLiveFields({
    concept: 'A fraction represents a part of a whole.',
    definition: 'A fraction has a numerator and denominator.',
    explanation: 'To add fractions, first express them with a common denominator.',
    examples: [{ problem: 'Find 1/2 + 1/4', steps: ['Find a common denominator', 'Add 2/4 + 1/4'], answer: '3/4' }],
    revision_notes: ['Use the LCM to find a common denominator.'],
  });
  assert.equal(result.exampleProblem, 'Find 1/2 + 1/4');
  assert.deepEqual(result.exampleSteps, ['Find a common denominator', 'Add 2/4 + 1/4']);
  assert.equal(result.exampleAnswer, '3/4');
  assert.equal(result.tip, 'Use the LCM to find a common denominator.');
  assert.equal(result.description, 'A fraction has a numerator and denominator.');
  assert.equal(result.difficulty, 'Beginner');
  assert.equal(result.estimatedDurationMinutes, 20);
  assert.match(result.contentMarkdown, /## Definition/);
  assert.match(result.contentMarkdown, /## Explanation/);
  assert.match(result.contentMarkdown, /## Worked example/);
  assert.match(result.contentMarkdown, /## Revision notes/);
});

test('does not pass example objects into the learner example_steps array', () => {
  const result = mapStagedLessonToLiveFields({
    examples: [{ problem: 'P', steps: ['Step one', 'Step two'], answer: 'A' }],
    revision_notes: [],
  });
  assert.ok(result.exampleSteps.every((step) => typeof step === 'string'));
});

test('keeps compatibility with legacy string-only example steps', () => {
  const result = mapStagedLessonToLiveFields({ examples: ['Step one', 'Step two'], revision_notes: [] });
  assert.deepEqual(result.exampleSteps, ['Step one', 'Step two']);
});
