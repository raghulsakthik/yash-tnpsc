import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectTopicPatterns, PATTERN_DETECTION_CONFIG } from '../src/domain/aiPatternDetection.mjs';

const base = { accuracy: 0.8, speed: 0.8, misconceptionRisk: 0, prerequisiteRisk: 0, storedRetention: 0, effectiveRetention: null, confidenceIssue: null };

test('real high misconception risk is detected as a possible misconception, never silently ignored', () => {
  const patterns = detectTopicPatterns({ ...base, misconceptionRisk: PATTERN_DETECTION_CONFIG.misconceptionRiskFloor });
  assert.ok(patterns.some((p) => p.pattern === 'POSSIBLE_MISCONCEPTION'));
});

test('a real OVERCONFIDENT confidence issue is passed through as its own pattern', () => {
  const patterns = detectTopicPatterns({ ...base, confidenceIssue: 'OVERCONFIDENT' });
  assert.ok(patterns.some((p) => p.pattern === 'OVERCONFIDENCE'));
});

test('real high accuracy with real slow speed is detected as a speed limitation', () => {
  const patterns = detectTopicPatterns({ ...base, speed: 0.1, accuracy: 0.9 });
  assert.ok(patterns.some((p) => p.pattern === 'SPEED_LIMITATION'));
});

test('a never-revised topic (storedRetention 0) never misreads as knowledge decay', () => {
  const patterns = detectTopicPatterns({ ...base, storedRetention: 0, effectiveRetention: 0 });
  assert.ok(!patterns.some((p) => p.pattern === 'KNOWLEDGE_DECAY'));
});

test('a real, decayed, previously-tracked retention is detected as knowledge decay', () => {
  const patterns = detectTopicPatterns({ ...base, storedRetention: 0.8, effectiveRetention: 0.3 });
  assert.ok(patterns.some((p) => p.pattern === 'KNOWLEDGE_DECAY'));
});

test('a real, unmastered prerequisite is detected as a foundation weakness', () => {
  const patterns = detectTopicPatterns({ ...base, prerequisiteRisk: 1 });
  assert.ok(patterns.some((p) => p.pattern === 'FOUNDATION_WEAKNESS'));
});

test('with no real signal crossing any real threshold, nothing is fabricated', () => {
  const patterns = detectTopicPatterns(base);
  assert.deepEqual(patterns, []);
});

test('multiple real patterns can be detected together, honestly, not forced into one', () => {
  const patterns = detectTopicPatterns({ ...base, prerequisiteRisk: 1, misconceptionRisk: 0.9 });
  assert.equal(patterns.length, 2);
});
