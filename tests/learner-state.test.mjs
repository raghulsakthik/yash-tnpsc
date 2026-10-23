import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  learningVelocity,
  misconceptionRisk,
  fatigueRisk,
  prerequisiteRisk,
  computeTopicState,
} from '../src/domain/learnerState.mjs';

test('learningVelocity reports 0 with a clear reason when there is too little history', () => {
  const result = learningVelocity([{ correct: true }, { correct: false }]);
  assert.equal(result.value, 0);
  assert.match(result.evidence, /not enough/);
});

test('learningVelocity reads positive when the recent half outperforms the older half', () => {
  // newest first: last 3 all correct, the 3 before that all wrong.
  const attempts = [{ correct: true }, { correct: true }, { correct: true }, { correct: false }, { correct: false }, { correct: false }];
  const result = learningVelocity(attempts);
  assert.ok(result.value > 0, `expected improvement, got ${result.value}`);
});

test('learningVelocity reads negative when she is sliding backward', () => {
  const attempts = [{ correct: false }, { correct: false }, { correct: false }, { correct: true }, { correct: true }, { correct: true }];
  const result = learningVelocity(attempts);
  assert.ok(result.value < 0, `expected decline, got ${result.value}`);
});

test('misconceptionRisk is 0 when every mistake is a guess or a slip, not a gap', () => {
  const attempts = [{ mistakeType: 'GUESS' }, { mistakeType: 'CARELESS' }, { mistakeType: null }];
  const result = misconceptionRisk(attempts);
  assert.equal(result.value, 0);
});

test('misconceptionRisk rises with CONCEPTUAL and UNKNOWN mistakes specifically', () => {
  const attempts = [{ mistakeType: 'CONCEPTUAL' }, { mistakeType: 'UNKNOWN' }, { mistakeType: 'GUESS' }, { mistakeType: null }];
  const result = misconceptionRisk(attempts);
  assert.equal(result.value, 0.5);
  assert.match(result.evidence, /2 of the last 4/);
});

test('fatigueRisk is 0 with too little history', () => {
  const result = fatigueRisk([{ correct: true, timeTakenMs: 5000 }]);
  assert.equal(result.value, 0);
});

test('fatigueRisk rises when the most recent attempts are slower and wronger than the ones before', () => {
  const tired = [
    { correct: false, timeTakenMs: 40000 },
    { correct: false, timeTakenMs: 38000 },
    { correct: true, timeTakenMs: 35000 },
    { correct: true, timeTakenMs: 10000 },
    { correct: true, timeTakenMs: 11000 },
    { correct: true, timeTakenMs: 9000 },
  ];
  const result = fatigueRisk(tired);
  assert.ok(result.value > 0.3, `expected a real fatigue signal, got ${result.value}`);
});

test('fatigueRisk stays low when pace and accuracy are steady throughout', () => {
  const steady = Array.from({ length: 8 }, () => ({ correct: true, timeTakenMs: 10000 }));
  const result = fatigueRisk(steady);
  assert.equal(result.value, 0);
});

test('prerequisiteRisk is 0 with no weaker prerequisite, and 1 - accuracy otherwise', () => {
  const graph = new Map([['percentage', [{ id: 'fractions', strength: 0.85 }]]]);
  const solid = prerequisiteRisk('percentage', graph, new Map([['fractions', 0.95]]));
  assert.equal(solid.value, 0);
  assert.equal(solid.weakestPrerequisite, null);

  const shaky = prerequisiteRisk('percentage', graph, new Map([['fractions', 0.3]]));
  assert.equal(Math.round(shaky.value * 100) / 100, 0.7);
  assert.equal(shaky.weakestPrerequisite.topicId, 'fractions');
});

test('computeTopicState passes the six persisted dimensions through untouched and attaches evidence for every derived signal', () => {
  const state = computeTopicState({
    topicId: 'aptitude.percentage',
    persisted: {
      mastery: 0.52,
      accuracy: 0.5,
      concept: 0.5,
      speed: 0.4,
      retention: 0.3,
      confidence: 0.6,
      consistency: 0.7,
      attemptCount: 12,
    },
    recentAttempts: [
      { correct: false, timeTakenMs: 20000, mistakeType: 'CONCEPTUAL' },
      { correct: true, timeTakenMs: 15000, mistakeType: null },
    ],
    prerequisiteGraph: new Map([['aptitude.percentage', [{ id: 'aptitude.fractions', strength: 0.85 }]]]),
    accuracyByTopic: new Map([['aptitude.fractions', 0.3]]),
  });

  assert.equal(state.mastery, 0.52);
  assert.equal(state.attemptCount, 12);
  assert.ok(state.prerequisiteRisk > 0);
  assert.equal(state.weakestPrerequisite.topicId, 'aptitude.fractions');
  assert.equal(state.evidence.attemptsConsidered, 2);
  assert.ok(typeof state.evidence.misconceptionRisk === 'string' && state.evidence.misconceptionRisk.length > 0);
  assert.ok(typeof state.evidence.prerequisiteRisk === 'string' && state.evidence.prerequisiteRisk.length > 0);
});
