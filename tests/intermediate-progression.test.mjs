import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProgressionTier, buildCandidatePool, ProgressionTier } from '../src/domain/intermediateProgression.mjs';

test('any foundation topic not yet ready keeps the tier at FOUNDATION', () => {
  const result = evaluateProgressionTier([
    { topicId: 'whole-numbers', ready: true },
    { topicId: 'division', ready: true },
    { topicId: 'fractions', ready: false },
    { topicId: 'decimals', ready: true },
  ]);
  assert.equal(result.tier, ProgressionTier.FOUNDATION);
  assert.equal(result.satisfiedCount, 3);
  assert.equal(result.totalCount, 4);
});

test('every foundation topic ready flips the tier to INTERMEDIATE', () => {
  const result = evaluateProgressionTier([
    { topicId: 'whole-numbers', ready: true },
    { topicId: 'division', ready: true },
    { topicId: 'fractions', ready: true },
    { topicId: 'decimals', ready: true },
  ]);
  assert.equal(result.tier, ProgressionTier.INTERMEDIATE);
  assert.match(result.reason, /all 4 foundation topics/);
});

test('no foundation topics defined at all stays FOUNDATION, not a vacuous INTERMEDIATE', () => {
  const result = evaluateProgressionTier([]);
  assert.equal(result.tier, ProgressionTier.FOUNDATION);
});

test('the candidate pool is foundation-only until the tier allows more', () => {
  const pool = buildCandidatePool({
    tier: ProgressionTier.FOUNDATION,
    foundationCandidateIds: ['a', 'b'],
    intermediateCandidateIds: ['c', 'd'],
  });
  assert.deepEqual(pool.topicIds, ['a', 'b']);
});

test('once INTERMEDIATE, the pool includes both foundation and intermediate candidates', () => {
  const pool = buildCandidatePool({
    tier: ProgressionTier.INTERMEDIATE,
    foundationCandidateIds: ['a', 'b'],
    intermediateCandidateIds: ['c', 'd'],
  });
  assert.deepEqual(pool.topicIds, ['a', 'b', 'c', 'd']);
});
