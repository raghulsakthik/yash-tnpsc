import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizePyqPerformance } from '../src/domain/pyq.mjs';

test('splits attempts into PYQ and authored buckets and computes accuracy for each', () => {
  const rows = [
    { topic_id: 't1', topic_name: 'T1', is_pyq: true, attempt_count: 10, correct_count: 8 },
    { topic_id: 't1', topic_name: 'T1', is_pyq: false, attempt_count: 20, correct_count: 10 },
  ];
  const summary = summarizePyqPerformance(rows);
  assert.equal(summary.overall.pyq.accuracy, 80);
  assert.equal(summary.overall.authored.accuracy, 50);
});

test('aggregates per-topic breakdown alongside the overall totals', () => {
  const rows = [
    { topic_id: 't1', topic_name: 'T1', is_pyq: true, attempt_count: 5, correct_count: 5 },
    { topic_id: 't2', topic_name: 'T2', is_pyq: true, attempt_count: 5, correct_count: 0 },
  ];
  const summary = summarizePyqPerformance(rows);
  assert.equal(summary.overall.pyq.accuracy, 50);
  assert.equal(summary.topics.find((t) => t.topicId === 't1').pyq.accuracy, 100);
  assert.equal(summary.topics.find((t) => t.topicId === 't2').pyq.accuracy, 0);
});

test('a bucket with zero attempts reports null accuracy, not NaN or zero', () => {
  const rows = [{ topic_id: 't1', topic_name: 'T1', is_pyq: true, attempt_count: 5, correct_count: 3 }];
  const summary = summarizePyqPerformance(rows);
  assert.equal(summary.overall.authored.accuracy, null);
  assert.equal(summary.overall.authored.attemptCount, 0);
});

test('no attempts at all produces an honest, empty summary, not a crash', () => {
  const summary = summarizePyqPerformance([]);
  assert.equal(summary.overall.pyq.accuracy, null);
  assert.equal(summary.topics.length, 0);
});
