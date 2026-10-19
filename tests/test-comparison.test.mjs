import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareTopicAcrossTests, decideInterventionNextStep, TEST_COMPARISON_CONFIG } from '../src/domain/testComparison.mjs';

test('the worked example reproduces exactly: Fractions 55% -> 77%, gain +22', () => {
  const test1Topic = {
    topicId: 'aptitude.fractions',
    topicName: 'Fractions',
    accuracy: 55,
    avgTimeTakenMs: 20000,
    avgConfidence: 3,
    mistakeCounts: { CONCEPTUAL: 3, GUESS: 1, CARELESS: 0, TIME_PRESSURE: 0, OVERCONFIDENT: 0, UNKNOWN: 0 },
    difficultyBreakdown: { EASY: { count: 3, correct: 2, accuracy: 66.67 } },
  };
  const test2Topic = {
    topicId: 'aptitude.fractions',
    topicName: 'Fractions',
    accuracy: 77,
    avgTimeTakenMs: 15000,
    avgConfidence: 4,
    mistakeCounts: { CONCEPTUAL: 1, GUESS: 0, CARELESS: 1, TIME_PRESSURE: 0, OVERCONFIDENT: 0, UNKNOWN: 0 },
    difficultyBreakdown: { EASY: { count: 3, correct: 3, accuracy: 100 } },
  };

  const comparison = compareTopicAcrossTests(test1Topic, test2Topic);

  assert.equal(comparison.test1Accuracy, 55);
  assert.equal(comparison.test2Accuracy, 77);
  assert.equal(comparison.accuracyGain, 22);
  assert.equal(comparison.speedGainMs, 5000); // faster by 5s
  assert.equal(comparison.confidenceDelta, 1);
  assert.equal(comparison.mistakeShift.CONCEPTUAL, -2); // down from 3 to 1 — real improvement
  assert.equal(comparison.difficultyGains.EASY, 33.33);
});

test('a +22 gain that has not yet reached the mastery floor recommends CONTINUE, not STOP', () => {
  const decision = decideInterventionNextStep({ accuracyGain: 22, test2Accuracy: 77 });
  assert.equal(decision.decision, 'CONTINUE');
});

test('a real gain that clears the mastery floor recommends STOP', () => {
  const decision = decideInterventionNextStep({ accuracyGain: 20, test2Accuracy: TEST_COMPARISON_CONFIG.masteryAccuracyFloor });
  assert.equal(decision.decision, 'STOP');
});

test('a real regression recommends ESCALATE, regardless of current accuracy', () => {
  const decision = decideInterventionNextStep({ accuracyGain: TEST_COMPARISON_CONFIG.regressionCeiling - 1, test2Accuracy: 40 });
  assert.equal(decision.decision, 'ESCALATE');
});

test('a small, inconclusive movement recommends CHANGE', () => {
  const up = decideInterventionNextStep({ accuracyGain: 5, test2Accuracy: 50 });
  const down = decideInterventionNextStep({ accuracyGain: -2, test2Accuracy: 50 });
  assert.equal(up.decision, 'CHANGE');
  assert.equal(down.decision, 'CHANGE');
});

test('missing speed/confidence data on either test degrades to null, not a wrong number', () => {
  const t1 = { topicId: 't', topicName: 'T', accuracy: 50, avgTimeTakenMs: null, avgConfidence: null, mistakeCounts: {}, difficultyBreakdown: {} };
  const t2 = { topicId: 't', topicName: 'T', accuracy: 60, avgTimeTakenMs: 10000, avgConfidence: 3, mistakeCounts: {}, difficultyBreakdown: {} };
  const comparison = compareTopicAcrossTests(t1, t2);
  assert.equal(comparison.speedGainMs, null);
  assert.equal(comparison.confidenceDelta, null);
});
