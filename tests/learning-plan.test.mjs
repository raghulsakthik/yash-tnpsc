import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateTopic, selectInitialAction, selectStartingDifficulty, DEFAULT_STARTING_DIFFICULTY } from '../src/domain/learningPlan.mjs';
import { PathStepType } from '../src/domain/learningPath.mjs';

test('a topic with no prerequisites is always open', () => {
  const gate = gateTopic('whole-numbers', new Map(), new Map());
  assert.equal(gate.open, true);
  assert.equal(gate.weakestPrerequisite, null);
});

test('a topic whose only prerequisite is untouched (0%) is gated closed', () => {
  const graph = new Map([['division', [{ id: 'whole-numbers', strength: 0.8 }]]]);
  const gate = gateTopic('division', graph, new Map([['whole-numbers', 0]]));
  assert.equal(gate.open, false);
  assert.equal(gate.weakestPrerequisite.topicId, 'whole-numbers');
  assert.match(gate.reason, /gated/);
});

test('a topic whose prerequisite is solid (well above the broken floor) is open', () => {
  const graph = new Map([['percentage', [{ id: 'fractions', strength: 0.85 }]]]);
  const gate = gateTopic('percentage', graph, new Map([['fractions', 0.9]]));
  assert.equal(gate.open, true);
});

test('selectStartingDifficulty falls back to the documented default only when there is no state yet', () => {
  assert.equal(selectStartingDifficulty(undefined), DEFAULT_STARTING_DIFFICULTY);
  assert.equal(selectStartingDifficulty(null), DEFAULT_STARTING_DIFFICULTY);
  assert.equal(selectStartingDifficulty(0.55), 0.55);
});

test('a brand new learner with every candidate gated except one gets exactly that one, as a FOUNDATION step', () => {
  const candidates = [
    { id: 'whole-numbers', name: 'Whole numbers', accuracy: 0, attemptCount: 0, currentDifficulty: 0.3, examWeight: 0, prerequisiteGap: 0, gate: { open: true, reason: 'ok', weakestPrerequisite: null } },
    { id: 'division', name: 'Division', accuracy: 0, attemptCount: 0, currentDifficulty: 0.3, examWeight: 0, prerequisiteGap: 1, gate: { open: false, reason: 'gated', weakestPrerequisite: { topicId: 'whole-numbers', accuracy: 0 } } },
  ];
  const result = selectInitialAction(candidates);
  assert.equal(result.topicId, 'whole-numbers');
  assert.equal(result.stepType, PathStepType.FOUNDATION);
  assert.equal(result.gatedOut.length, 1);
  assert.equal(result.gatedOut[0].topicId, 'division');
});

test('a topic already underway (attemptCount > 0) gets PRACTICE, not FOUNDATION', () => {
  const candidates = [
    { id: 'fractions', name: 'Fractions', accuracy: 0.45, attemptCount: 8, currentDifficulty: 0.35, examWeight: 0, prerequisiteGap: 0, gate: { open: true, reason: 'ok', weakestPrerequisite: null } },
  ];
  const result = selectInitialAction(candidates);
  assert.equal(result.stepType, PathStepType.PRACTICE);
  assert.equal(result.difficulty, 0.35);
});

test('when every candidate is gated, selectInitialAction returns null rather than picking a blocked topic', () => {
  const candidates = [
    { id: 'percentage', name: 'Percentage', accuracy: 0, attemptCount: 0, currentDifficulty: 0.3, examWeight: 0.5, prerequisiteGap: 1, gate: { open: false, reason: 'gated', weakestPrerequisite: { topicId: 'fractions', accuracy: 0 } } },
  ];
  assert.equal(selectInitialAction(candidates), null);
});
