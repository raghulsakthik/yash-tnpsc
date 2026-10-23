import test from 'node:test';
import assert from 'node:assert/strict';
import { createPendingQuestion, resolvePendingQuestion } from '../src/lib/quicklabTokens.mjs';

test('quick lab token is bound to learner and mode', () => {
  const token = createPendingQuestion(2, { learnerId: 'learner-a', mode: 'quick-math' });
  assert.equal(resolvePendingQuestion(token, { learnerId: 'learner-b', mode: 'quick-math' }), null);
});

test('wrong learner or mode cannot burn a valid token', () => {
  const token = createPendingQuestion(0, { learnerId: 'learner-a', mode: 'quick-math' });
  assert.equal(resolvePendingQuestion(token, { learnerId: 'learner-a', mode: 'number-rush' }), null);
  assert.equal(resolvePendingQuestion(token, { learnerId: 'learner-a', mode: 'quick-math' }).correctIndex, 0);
});

test('quick lab token is single-use', () => {
  const token = createPendingQuestion(1, { learnerId: 'learner-a', mode: 'number-rush' });
  const first = resolvePendingQuestion(token, { learnerId: 'learner-a', mode: 'number-rush' });
  assert.equal(first.correctIndex, 1);
  assert.equal(resolvePendingQuestion(token, { learnerId: 'learner-a', mode: 'number-rush' }), null);
});
