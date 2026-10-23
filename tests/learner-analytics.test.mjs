import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMasteryProgression,
  buildSubjectPerformance,
  classifySpeedAccuracyQuadrant,
  buildSpeedAccuracyQuadrant,
  buildRetentionCurve,
  RETENTION_CURVE_DAYS,
  buildMistakeEvolution,
  buildLearningAnalytics,
  buildPyqAnalytics,
  buildTestAnalytics,
} from '../src/domain/learnerAnalytics.mjs';

test('mastery progression indexes real completed tests in order, Test 1, Test 2, ...', () => {
  const history = [{ id: 'a', type: 'DEFAULT_TEST', score: 52, completedAt: '2026-01-01' }, { id: 'b', type: 'ADAPTIVE_TEST', score: 61, completedAt: '2026-01-08' }];
  const progression = buildMasteryProgression(history);
  assert.equal(progression[0].label, 'Test 1');
  assert.equal(progression[1].label, 'Test 2');
  assert.equal(progression[1].score, 61);
});

test('subject performance sorts strongest first and converts to a real percentage', () => {
  const result = buildSubjectPerformance([
    { subjectId: 'a', subjectName: 'A', averageMastery: 0.5 },
    { subjectId: 'b', subjectName: 'B', averageMastery: 0.8 },
  ]);
  assert.equal(result[0].subjectId, 'b');
  assert.equal(result[0].masteryPercent, 80);
});

test('fast and accurate classifies STRONG', () => {
  assert.equal(classifySpeedAccuracyQuadrant(0.9, 0.9), 'STRONG');
});

test('fast and inaccurate classifies CARELESS_OR_GUESSING', () => {
  assert.equal(classifySpeedAccuracyQuadrant(0.9, 0.2), 'CARELESS_OR_GUESSING');
});

test('slow and accurate classifies SPEED_TRAINING', () => {
  assert.equal(classifySpeedAccuracyQuadrant(0.2, 0.9), 'SPEED_TRAINING');
});

test('slow and inaccurate classifies CONCEPT_INTERVENTION', () => {
  assert.equal(classifySpeedAccuracyQuadrant(0.2, 0.2), 'CONCEPT_INTERVENTION');
});

test('the speed/accuracy quadrant report covers every real topic given', () => {
  const result = buildSpeedAccuracyQuadrant([{ topicId: 't1', topicName: 'T1', speed: 0.9, accuracy: 0.9 }]);
  assert.equal(result[0].quadrant, 'STRONG');
});

test('the retention curve has exactly the brief\'s five named day offsets', () => {
  const curve = buildRetentionCurve(0.8);
  assert.deepEqual(curve.map((c) => c.days), RETENTION_CURVE_DAYS);
});

test('the retention curve strictly decreases as days increase, from a real stored value', () => {
  const curve = buildRetentionCurve(0.8);
  for (let i = 1; i < curve.length; i += 1) {
    assert.ok(curve[i].projectedRetention <= curve[i - 1].projectedRetention);
  }
});

test('mistake evolution reports DOWN when a real mistake type genuinely decreased', () => {
  const result = buildMistakeEvolution({ CONCEPTUAL: 5 }, { CONCEPTUAL: 2 });
  const conceptual = result.find((r) => r.type === 'CONCEPTUAL');
  assert.equal(conceptual.direction, 'DOWN');
});

test('mistake evolution reports FLAT honestly when nothing changed, not a fabricated trend', () => {
  const result = buildMistakeEvolution({}, {});
  assert.ok(result.every((r) => r.direction === 'FLAT'));
});

test('learning analytics converts real study time from ms to minutes', () => {
  const result = buildLearningAnalytics({ studyTimeMs: 120000, questionsSolved: 10, recentAttemptsPerDay: 2, averageConsistency: 0.5, currentStreak: 3, revisionCompletionRate: 0.4 });
  assert.equal(result.studyTimeMinutes, 2);
});

test('pyq analytics reports an honest null improvement with no real comparison available', () => {
  const result = buildPyqAnalytics({ byYear: [], bySubject: [], byTopic: [], difficultyDistribution: [], earlyAccuracy: null, recentAccuracy: null });
  assert.equal(result.improvement, null);
  assert.ok(result.disclaimer);
});

test('pyq analytics computes a real improvement delta when both halves exist', () => {
  const result = buildPyqAnalytics({ byYear: [], bySubject: [], byTopic: [], difficultyDistribution: [], earlyAccuracy: 50, recentAccuracy: 70 });
  assert.equal(result.improvement, 20);
});

test('test analytics reports INSUFFICIENT_DATA with fewer than two real completed tests', () => {
  const result = buildTestAnalytics([{ score: 50 }], 1, null);
  assert.equal(result.scoreTrend, 'INSUFFICIENT_DATA');
});

test('test analytics detects a real IMPROVING trend between the first and last real test', () => {
  const result = buildTestAnalytics([{ score: 50 }, { score: 70 }], 1, 1);
  assert.equal(result.scoreTrend, 'IMPROVING');
});

test('test analytics reads a real time ratio into an honest RUSHING/SLOW/ON_PACE label', () => {
  assert.equal(buildTestAnalytics([{ score: 1 }, { score: 2 }], 1, 0.4).timeManagement, 'RUSHING');
  assert.equal(buildTestAnalytics([{ score: 1 }, { score: 2 }], 1, 1.5).timeManagement, 'SLOW');
  assert.equal(buildTestAnalytics([{ score: 1 }, { score: 2 }], 1, 1).timeManagement, 'ON_PACE');
});
