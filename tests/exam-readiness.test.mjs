import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeExamReadinessIndex, explainReadinessChange, readinessLabel, EXAM_READINESS_WEIGHTS, EXAM_READINESS_DISCLAIMER } from '../src/domain/examReadiness.mjs';

const fullSignals = Object.fromEntries(Object.keys(EXAM_READINESS_WEIGHTS).map((k) => [k, 1]));
const zeroSignals = Object.fromEntries(Object.keys(EXAM_READINESS_WEIGHTS).map((k) => [k, 0]));

test('every signal at maximum scores a real 100', () => {
  const result = computeExamReadinessIndex(fullSignals);
  assert.equal(result.overall, 100);
  assert.equal(result.label, 'STRONG');
});

test('every signal at zero scores a real 0', () => {
  const result = computeExamReadinessIndex(zeroSignals);
  assert.equal(result.overall, 0);
  assert.equal(result.label, 'NEEDS_WORK');
});

test('readinessLabel bands match the configured floors exactly', () => {
  assert.equal(readinessLabel(85), 'STRONG');
  assert.equal(readinessLabel(84.99), 'GOOD');
  assert.equal(readinessLabel(70), 'GOOD');
  assert.equal(readinessLabel(50), 'DEVELOPING');
  assert.equal(readinessLabel(49.99), 'NEEDS_WORK');
});

test('a missing signal defaults to zero rather than throwing', () => {
  const result = computeExamReadinessIndex({});
  assert.equal(result.overall, 0);
});

test('with no prior snapshot, the explanation is honest about having nothing to compare', () => {
  const current = computeExamReadinessIndex(fullSignals);
  const result = explainReadinessChange(current, null);
  assert.equal(result.changed, null);
  assert.match(result.explanation, /no prior snapshot/);
});

test('a real component improvement produces a real, specific explanation naming it', () => {
  const previous = computeExamReadinessIndex(zeroSignals);
  const current = computeExamReadinessIndex({ ...zeroSignals, mastery: 1 });
  const result = explainReadinessChange(current, previous);
  assert.ok(result.delta > 0);
  assert.match(result.explanation, /mastery improved/);
});

test('a real component drop produces a real, specific explanation naming it', () => {
  const previous = computeExamReadinessIndex(fullSignals);
  const current = computeExamReadinessIndex({ ...fullSignals, retention: 0 });
  const result = explainReadinessChange(current, previous);
  assert.ok(result.delta < 0);
  assert.match(result.explanation, /retention dropped/);
});

test('tiny, below-noise-floor moves are never named individually', () => {
  const previous = computeExamReadinessIndex(zeroSignals);
  const current = computeExamReadinessIndex({ ...zeroSignals, mastery: 0.001 });
  const result = explainReadinessChange(current, previous);
  assert.match(result.explanation, /no individual component moved/);
});

test('the disclaimer is explicit that this is not a pass probability', () => {
  assert.match(EXAM_READINESS_DISCLAIMER, /not a guaranteed pass probability/);
});
