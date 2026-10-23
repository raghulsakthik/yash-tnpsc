import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keywordOverlapScore, rankByKeywordOverlap } from '../src/domain/aiKnowledgeBase.mjs';

test('identical real text scores a real 1', () => {
  assert.equal(keywordOverlapScore('percentage of a number', 'percentage of a number'), 1);
});

test('completely unrelated real text scores a real 0', () => {
  assert.equal(keywordOverlapScore('percentage calculation', 'elephant giraffe zoo'), 0);
});

test('an empty query never divides by zero', () => {
  assert.equal(keywordOverlapScore('', 'some document'), 0);
});

test('ranking excludes zero-score candidates and sorts by real score, highest first', () => {
  const results = rankByKeywordOverlap('percentage fraction', [
    { id: 'a', text: 'percentage fraction conversion' },
    { id: 'b', text: 'completely unrelated topic' },
    { id: 'c', text: 'percentage basics' },
  ]);
  assert.equal(results.length, 2);
  assert.equal(results[0].id, 'a');
});

test('ranking respects a real limit, never returning more than asked', () => {
  const candidates = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, text: 'percentage' }));
  const results = rankByKeywordOverlap('percentage', candidates, 5);
  assert.equal(results.length, 5);
});
