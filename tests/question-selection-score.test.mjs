import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreQuestionCandidate, selectBestQuestion, QUESTION_SELECTION_WEIGHTS } from '../src/domain/questionSelectionScore.mjs';

const baseContext = { targetDifficulty: 0.5, topicNeed: 0.5, revisionUrgency: 0, misconceptionRelevance: 0, prerequisiteRelevance: 0 };

test('every configured weight is represented in the breakdown', () => {
  const { breakdown } = scoreQuestionCandidate({ difficulty: 0.5, source: 'authored' }, baseContext);
  for (const key of Object.keys(QUESTION_SELECTION_WEIGHTS)) {
    assert.ok(key in breakdown, key);
  }
});

test('a real past-paper question scores higher on pyqRelevance than an authored one, all else equal', () => {
  const pyq = scoreQuestionCandidate({ difficulty: 0.5, source: 'tnpsc-2018' }, baseContext);
  const authored = scoreQuestionCandidate({ difficulty: 0.5, source: 'authored' }, baseContext);
  assert.ok(pyq.breakdown.pyqRelevance > authored.breakdown.pyqRelevance);
  assert.ok(pyq.score > authored.score);
});

test('a high real topicNeed pulls the total score up, all else equal', () => {
  const needy = scoreQuestionCandidate({ difficulty: 0.5, source: 'authored' }, { ...baseContext, topicNeed: 1 });
  const fine = scoreQuestionCandidate({ difficulty: 0.5, source: 'authored' }, { ...baseContext, topicNeed: 0 });
  assert.ok(needy.score > fine.score);
});

test('an exact difficulty match scores higher than a mismatched one', () => {
  const exact = scoreQuestionCandidate({ difficulty: 0.5, source: 'authored' }, baseContext);
  const off = scoreQuestionCandidate({ difficulty: 0.1, source: 'authored' }, baseContext);
  assert.ok(exact.breakdown.difficultyFit > off.breakdown.difficultyFit);
});

test('selectBestQuestion returns null for an empty candidate list, never throws', () => {
  assert.equal(selectBestQuestion([], baseContext), null);
});

test('selectBestQuestion picks the real highest-scoring candidate, with its score attached', () => {
  const candidates = [
    { id: 'a', difficulty: 0.1, source: 'authored' },
    { id: 'b', difficulty: 0.5, source: 'tnpsc-2018' },
  ];
  const best = selectBestQuestion(candidates, baseContext);
  assert.equal(best.id, 'b');
  assert.ok(typeof best.score === 'number');
});
