import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLearnerAiContext } from '../src/domain/learnerAiContext.mjs';

test('matches the brief\'s exact JSON shape', () => {
  const ctx = buildLearnerAiContext({ topicId: 'percentage', mastery: 0.62, accuracy: 0.5, recentMistakeType: 'fraction_conversion', confidence: 2 });
  assert.deepEqual(Object.keys(ctx).sort(), ['confidence', 'currentTopic', 'difficulty', 'mastery', 'preferredExplanation', 'recentMistake', 'recentPerformance'].sort());
});

test('high mastery reads as hard difficulty, low as easy', () => {
  assert.equal(buildLearnerAiContext({ topicId: 't', mastery: 0.9, accuracy: 0.5 }).difficulty, 'hard');
  assert.equal(buildLearnerAiContext({ topicId: 't', mastery: 0.1, accuracy: 0.5 }).difficulty, 'easy');
});

test('weak real accuracy reads as weak recentPerformance, never fabricated as strong', () => {
  assert.equal(buildLearnerAiContext({ topicId: 't', mastery: 0.5, accuracy: 0.2 }).recentPerformance, 'weak');
});

test('no stated preference defaults explicitly to simple, not a guessed one', () => {
  const ctx = buildLearnerAiContext({ topicId: 't', mastery: 0.5, accuracy: 0.5 });
  assert.equal(ctx.preferredExplanation, 'simple');
});

test('no recent mistake is reported as a real null, never fabricated', () => {
  const ctx = buildLearnerAiContext({ topicId: 't', mastery: 0.5, accuracy: 0.5, recentMistakeType: null });
  assert.equal(ctx.recentMistake, null);
});
