import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectSubject, subjectExamWeight, daysSince, NEGLECT_FULL_DAYS } from '../src/domain/crossSubjectDecision.mjs';

test('subjectExamWeight is 0 for a subject with no real question count, never NaN', () => {
  assert.equal(subjectExamWeight(0, 100), 0);
  assert.equal(subjectExamWeight(null, 100), 0);
});

test('subjectExamWeight scales relative to the largest subject on the paper', () => {
  assert.equal(subjectExamWeight(100, 100), 1);
  assert.equal(subjectExamWeight(50, 100), 0.5);
});

test('daysSince is null when never studied, not a crash or a fake number', () => {
  assert.equal(daysSince(null), null);
});

test('daysSince computes a real elapsed day count', () => {
  const now = new Date('2026-03-10T00:00:00Z');
  const fiveDaysAgo = new Date('2026-03-05T00:00:00Z');
  assert.equal(daysSince(fiveDaysAgo, now), 5);
});

test('a never-touched subject is the most neglected, even without a last_studied_at date', () => {
  const subjects = [
    { id: 'strong', name: 'Strong', accuracy: 0.9, examWeight: 0.5, attemptCount: 40, daysSinceLastStudied: 1 },
    { id: 'untouched', name: 'Untouched', accuracy: 0, examWeight: 0.5, attemptCount: 0, daysSinceLastStudied: null },
  ];
  const result = selectSubject(subjects);
  assert.equal(result.id, 'untouched');
});

test('a high real exam weight pulls selection toward that subject when other signals are similar', () => {
  const subjects = [
    { id: 'low-weight', name: 'Low', accuracy: 0.5, examWeight: 0.1, attemptCount: 10, daysSinceLastStudied: 3 },
    { id: 'high-weight', name: 'High', accuracy: 0.5, examWeight: 0.9, attemptCount: 10, daysSinceLastStudied: 3 },
  ];
  const result = selectSubject(subjects);
  assert.equal(result.id, 'high-weight');
});

test('a subject neglected beyond the full-neglect floor scores the same as one neglected far longer — the signal saturates, not unboundedly rewards abandonment', () => {
  const subjects = [
    { id: 'a', name: 'A', accuracy: 0.5, examWeight: 0.5, attemptCount: 10, daysSinceLastStudied: NEGLECT_FULL_DAYS },
    { id: 'b', name: 'B', accuracy: 0.5, examWeight: 0.5, attemptCount: 10, daysSinceLastStudied: NEGLECT_FULL_DAYS * 10 },
  ];
  const scored = subjects.map((s) => selectSubject([s]));
  assert.equal(scored[0].score, scored[1].score);
});

test('no subjects at all returns null, not a crash', () => {
  assert.equal(selectSubject([]), null);
});
