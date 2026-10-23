import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreRecommendationCandidate, selectNextBestAction, RECOMMENDATION_WEIGHTS } from '../src/domain/recommendationEngine.mjs';
import { summarizeInterventionEffectiveness } from '../src/domain/intervention.mjs';

const fullFactors = Object.fromEntries(Object.keys(RECOMMENDATION_WEIGHTS).map((k) => [k, 1]));
const noFactors = Object.fromEntries(Object.keys(RECOMMENDATION_WEIGHTS).map((k) => [k, 0]));

test('every factor at maximum scores a real confidence of 1', () => {
  const result = scoreRecommendationCandidate({ action: 'PRACTICE', factors: fullFactors });
  assert.equal(result.confidence, 1);
});

test('every factor at zero scores a real confidence of 0', () => {
  const result = scoreRecommendationCandidate({ action: 'PRACTICE', factors: noFactors });
  assert.equal(result.confidence, 0);
});

test('selectNextBestAction returns null for no candidates, never throws', () => {
  assert.equal(selectNextBestAction([]), null);
});

test('selectNextBestAction picks the real highest-confidence candidate and reports every candidate considered', () => {
  const candidates = [
    { action: 'PRACTICE', factors: noFactors },
    { action: 'REVISION', factors: fullFactors },
  ];
  const best = selectNextBestAction(candidates);
  assert.equal(best.action, 'REVISION');
  assert.equal(best.candidates.length, 2);
  assert.equal(best.candidates[0].action, 'REVISION');
});

test('missing factors default to zero rather than throwing', () => {
  const result = scoreRecommendationCandidate({ action: 'PRACTICE' });
  assert.equal(result.confidence, 0);
});

test('intervention effectiveness summary counts real verdicts, never a fabricated one', () => {
  const interventions = [
    { status: 'EVALUATED', learningGain: 0.1, interventionType: 'PRACTICE' },
    { status: 'EVALUATED', learningGain: -0.1, interventionType: 'PRACTICE' },
    { status: 'EVALUATED', learningGain: 0, interventionType: 'REVISION' },
    { status: 'ACTIVE', learningGain: null, interventionType: 'PRACTICE' },
  ];
  const summary = summarizeInterventionEffectiveness(interventions);
  assert.equal(summary.totalEvaluated, 3);
  assert.equal(summary.totalPending, 1);
  assert.equal(summary.counts.IMPROVED, 1);
  assert.equal(summary.counts.REGRESSED, 1);
  assert.equal(summary.counts.NO_CHANGE, 1);
  assert.equal(summary.byType.PRACTICE.count, 2);
});

test('no evaluated interventions at all reports an honest null average gain, not zero or NaN', () => {
  const summary = summarizeInterventionEffectiveness([]);
  assert.equal(summary.averageLearningGain, null);
  assert.equal(summary.totalEvaluated, 0);
});
