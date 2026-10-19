import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestDifficultyAdjustment, DIFFICULTY_INTELLIGENCE_CONFIG } from '../src/domain/difficultyIntelligence.mjs';

const base = { authoredDifficulty: 0.5, attemptCount: 10, accuracy: 0.5, skipRate: 0, hintRate: 0 };

test('too few attempts reports NONE confidence and suggests no change', () => {
  const result = suggestDifficultyAdjustment({ ...base, attemptCount: DIFFICULTY_INTELLIGENCE_CONFIG.minAttemptsForSignal - 1 });
  assert.equal(result.confidence, 'NONE');
  assert.equal(result.delta, 0);
  assert.equal(result.suggestedDifficulty, base.authoredDifficulty);
});

test('real low accuracy suggests a positive delta — this reads harder than authored', () => {
  const result = suggestDifficultyAdjustment({ ...base, accuracy: 0.1 });
  assert.ok(result.delta > 0, result.delta);
  assert.ok(result.suggestedDifficulty > base.authoredDifficulty);
  assert.match(result.reason, /harder/);
});

test('real high accuracy with little struggle suggests a negative delta — this reads easier than authored', () => {
  const result = suggestDifficultyAdjustment({ ...base, accuracy: 0.95, skipRate: 0, hintRate: 0 });
  assert.ok(result.delta < 0, result.delta);
  assert.ok(result.suggestedDifficulty < base.authoredDifficulty);
  assert.match(result.reason, /easier/);
});

test('real high accuracy with heavy hint reliance does not suggest easier — the struggle is real', () => {
  const result = suggestDifficultyAdjustment({ ...base, accuracy: 0.95, skipRate: 0, hintRate: 0.6 });
  assert.equal(result.delta, 0);
});

test('ordinary, mid-range accuracy suggests no adjustment', () => {
  const result = suggestDifficultyAdjustment({ ...base, accuracy: 0.5 });
  assert.equal(result.delta, 0);
  assert.equal(result.confidence, 'LOW');
});

test('the suggested delta is never larger than the configured cap, however extreme the inputs', () => {
  const result = suggestDifficultyAdjustment({ ...base, attemptCount: 1000, accuracy: 0, skipRate: 1, hintRate: 1 });
  assert.ok(Math.abs(result.delta) <= DIFFICULTY_INTELLIGENCE_CONFIG.maxSuggestedDelta + 1e-9);
});

test('the suggested difficulty is always clamped into 0..1', () => {
  const result = suggestDifficultyAdjustment({ ...base, authoredDifficulty: 0.95, accuracy: 0 });
  assert.ok(result.suggestedDifficulty <= 1);
  const resultLow = suggestDifficultyAdjustment({ ...base, authoredDifficulty: 0.05, accuracy: 1, skipRate: 0, hintRate: 0 });
  assert.ok(resultLow.suggestedDifficulty >= 0);
});

test('a large, real attempt count reports MODERATE confidence, not just LOW', () => {
  const result = suggestDifficultyAdjustment({ ...base, attemptCount: DIFFICULTY_INTELLIGENCE_CONFIG.minAttemptsForSignal * 3, accuracy: 0.05 });
  assert.equal(result.confidence, 'MODERATE');
});
