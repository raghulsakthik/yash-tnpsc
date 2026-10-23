import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMistakePatterns, buildCognitiveProblems, buildRetentionProblems } from '../src/domain/testDiagnostics.mjs';

test('mistake patterns count real mistake types honestly, never a fabricated category', () => {
  const results = [{ mistakeType: 'GUESS' }, { mistakeType: 'GUESS' }, { mistakeType: 'CARELESS' }, { mistakeType: null }];
  const report = analyzeMistakePatterns(results);
  assert.equal(report.counts.GUESS, 2);
  assert.equal(report.counts.CARELESS, 1);
  assert.equal(report.totalMistakes, 3);
  assert.equal(report.dominant, 'GUESS');
});

test('no mistakes at all reports an honest null dominant type, not a crash', () => {
  const report = analyzeMistakePatterns([{ mistakeType: null }]);
  assert.equal(report.totalMistakes, 0);
  assert.equal(report.dominant, null);
});

test('cognitive problems reports real guessing and careless counts from real mistake data', () => {
  const results = [{ mistakeType: 'GUESS' }, { mistakeType: 'CARELESS' }];
  const problems = buildCognitiveProblems(results, [], []);
  assert.equal(problems.guessing.count, 1);
  assert.equal(problems.carelessErrors.count, 1);
  assert.match(problems.guessing.reason, /faster than anyone/);
});

test('cognitive problems reports an honest null reason when nothing of that kind happened', () => {
  const problems = buildCognitiveProblems([{ mistakeType: null }], [], []);
  assert.equal(problems.guessing.reason, null);
});

test('retention problems are flagged only for a topic that was really strong before and has really dropped', () => {
  const previous = new Map([['t1', { topicId: 't1', topicName: 'T1', accuracy: 85 }]]);
  const current = [{ topicId: 't1', topicName: 'T1', accuracy: 60 }];
  const problems = buildRetentionProblems(current, previous);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].recommendation, 'REVISION');
});

test('no prior evidence for a topic means no retention-problem verdict, never a guessed one', () => {
  const problems = buildRetentionProblems([{ topicId: 't1', topicName: 'T1', accuracy: 60 }], new Map());
  assert.equal(problems.length, 0);
});

test('a topic that was never strong before is not a retention story even if it is weak now', () => {
  const previous = new Map([['t1', { topicId: 't1', topicName: 'T1', accuracy: 50 }]]);
  const current = [{ topicId: 't1', topicName: 'T1', accuracy: 30 }];
  const problems = buildRetentionProblems(current, previous);
  assert.equal(problems.length, 0);
});

test('a topic that stayed strong is never flagged as a retention problem', () => {
  const previous = new Map([['t1', { topicId: 't1', topicName: 'T1', accuracy: 85 }]]);
  const current = [{ topicId: 't1', topicName: 'T1', accuracy: 88 }];
  const problems = buildRetentionProblems(current, previous);
  assert.equal(problems.length, 0);
});
