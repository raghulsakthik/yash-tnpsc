import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachGameToWeeklyPlan } from '../src/domain/weeklyAssignment.mjs';

function fakePlan() {
  return {
    days: {
      MONDAY: { type: 'LESSON', topicId: 'aptitude.fractions' },
      FRIDAY: { type: 'GAME', topicId: 'aptitude.fractions', topicName: 'Fractions', available: false, reason: 'no game engine exists yet' },
      SUNDAY: { type: 'WEEKLY_TEST' },
    },
  };
}

test('no real game match leaves the plan completely untouched', () => {
  const plan = fakePlan();
  const result = attachGameToWeeklyPlan(plan, null);
  assert.deepEqual(result, plan);
  assert.equal(result, plan); // not even a new object — Phase 16's output passes straight through
});

test('a real game match overlays Friday as available, with a real game name attached', () => {
  const plan = fakePlan();
  const result = attachGameToWeeklyPlan(plan, { id: 'speed-round-aptitude', name: 'Aptitude Speed Round' });
  assert.equal(result.days.FRIDAY.available, true);
  assert.equal(result.days.FRIDAY.gameDefinitionId, 'speed-round-aptitude');
  assert.equal(result.days.FRIDAY.gameName, 'Aptitude Speed Round');
});

test('every other day of the week is untouched by the overlay', () => {
  const plan = fakePlan();
  const result = attachGameToWeeklyPlan(plan, { id: 'x', name: 'X' });
  assert.deepEqual(result.days.MONDAY, plan.days.MONDAY);
  assert.deepEqual(result.days.SUNDAY, plan.days.SUNDAY);
});

test('the overlay keeps Friday\'s original topicId and topicName', () => {
  const plan = fakePlan();
  const result = attachGameToWeeklyPlan(plan, { id: 'x', name: 'X' });
  assert.equal(result.days.FRIDAY.topicId, 'aptitude.fractions');
  assert.equal(result.days.FRIDAY.topicName, 'Fractions');
});
