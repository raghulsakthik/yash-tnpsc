import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainBlueprint, explainQuestionSelection } from '../src/domain/testExplanation.mjs';

test('explainBlueprint reports only the real, non-zero categories, most-weighted first', () => {
  const blueprint = { learnerTier: 'DEVELOPING', categories: { FOUNDATION: 0.2, WEAK_AREAS: 0.25, REVISION: 0, ACTUAL_PYQ: 0.2, INSPIRED_MCQ: 0, NEW_CONCEPTS: 0.1 } };
  const result = explainBlueprint(blueprint);
  assert.equal(result.lines.length, 4); // FOUNDATION/WEAK_AREAS/ACTUAL_PYQ/NEW_CONCEPTS — REVISION and INSPIRED_MCQ are real zeros, correctly excluded
  assert.match(result.lines[0], /25% weak areas/);
  assert.ok(!result.summary.includes('revision'));
  assert.ok(!result.summary.includes('TNPSC-inspired'));
});

test('explainQuestionSelection names every real factor that was actually high', () => {
  const result = explainQuestionSelection('Percentage', { topicNeed: 0.8, pyqRelevance: 1, novelty: 0.9, prerequisiteRelevance: 0.1, revisionUrgency: 0.1, misconceptionRelevance: 0.1 });
  assert.match(result.summary, /Percentage/);
  assert.ok(result.reasons.length >= 2);
  assert.match(result.summary, /currently weak/);
});

test('explainQuestionSelection is honest when no factor dominated, never inventing a reason', () => {
  const result = explainQuestionSelection('Percentage', {});
  assert.equal(result.reasons.length, 0);
  assert.match(result.summary, /well-rounded pick/);
});
