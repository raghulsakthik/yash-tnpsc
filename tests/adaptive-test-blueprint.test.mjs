import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAdaptiveTestBlueprint, classifyLearnerTier, ADAPTIVE_TEST_BLUEPRINT_CONFIG } from '../src/domain/adaptiveTestBlueprint.mjs';

const fullEvidence = { averageMastery: 0.5, hasRevisionDue: true, hasPyqContent: true, hasInspiredContent: true, questionCount: 20 };

test('a strong learner gets the configured strong difficulty distribution', () => {
  const tier = classifyLearnerTier(ADAPTIVE_TEST_BLUEPRINT_CONFIG.strongMasteryFloor);
  assert.equal(tier, 'STRONG');
});

test('a struggling learner gets the configured struggling difficulty distribution', () => {
  const tier = classifyLearnerTier(ADAPTIVE_TEST_BLUEPRINT_CONFIG.strugglingMasteryCeiling);
  assert.equal(tier, 'STRUGGLING');
});

test('no mastery evidence at all defaults to DEVELOPING, neither extreme', () => {
  assert.equal(classifyLearnerTier(null), 'DEVELOPING');
});

test('with every category available, the real category shares sum to 1', () => {
  const blueprint = buildAdaptiveTestBlueprint(fullEvidence);
  const total = Object.values(blueprint.categories).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 0.01, total);
});

test('category question counts always sum to exactly the real requested count, never off by rounding', () => {
  const blueprint = buildAdaptiveTestBlueprint(fullEvidence);
  const total = Object.values(blueprint.categoryQuestionCounts).reduce((a, b) => a + b, 0);
  assert.equal(total, fullEvidence.questionCount);
});

test('no revision due honestly zeroes the REVISION category rather than reserving empty slots', () => {
  const blueprint = buildAdaptiveTestBlueprint({ ...fullEvidence, hasRevisionDue: false });
  assert.equal(blueprint.categories.REVISION, 0);
  assert.equal(blueprint.categoryQuestionCounts.REVISION, 0);
});

test('no PYQ content for her topics honestly zeroes ACTUAL_PYQ, redistributed to the rest', () => {
  const blueprint = buildAdaptiveTestBlueprint({ ...fullEvidence, hasPyqContent: false });
  assert.equal(blueprint.categories.ACTUAL_PYQ, 0);
  const total = Object.values(blueprint.categories).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 0.01);
});

test('no inspired content (the real, permanent state of this environment) honestly zeroes INSPIRED_MCQ', () => {
  const blueprint = buildAdaptiveTestBlueprint({ ...fullEvidence, hasInspiredContent: false });
  assert.equal(blueprint.categories.INSPIRED_MCQ, 0);
  assert.equal(blueprint.categoryQuestionCounts.INSPIRED_MCQ, 0);
});

test('the difficulty distribution itself always sums to 1, for every tier', () => {
  for (const tier of ['STRONG', 'DEVELOPING', 'STRUGGLING']) {
    const dist = ADAPTIVE_TEST_BLUEPRINT_CONFIG.difficultyDistributions[tier];
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1) < 0.001, `${tier}: ${total}`);
  }
});
