import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAdaptiveLessonPlan, LessonPlanStepType } from '../src/domain/adaptiveLessonPlan.mjs';
import { AdaptiveAction } from '../src/domain/enums.mjs';

test('Learner A (percentage needs its fractions prerequisite fixed first) gets the exact worked-example detour, then still reaches ratio', () => {
  const syllabusOrder = ['numbers', 'percentage', 'ratio'];
  const decisionsByTopic = new Map([
    ['numbers', { action: AdaptiveAction.ADVANCE_TOPIC, reason: 'solid', context: {} }],
    [
      'percentage',
      {
        action: AdaptiveAction.PREREQUISITE_LESSON,
        reason: 'fractions is the real problem',
        context: { weakestPrerequisite: { topicId: 'fractions', accuracy: 38 } },
      },
    ],
    ['ratio', { action: AdaptiveAction.ADVANCE_TOPIC, reason: 'solid', context: {} }],
  ]);

  const steps = buildAdaptiveLessonPlan(syllabusOrder, decisionsByTopic);

  assert.deepEqual(
    steps.map((s) => `${s.topicId}:${s.type}`),
    [
      'numbers:ADVANCE',
      'fractions:PREREQUISITE_LESSON',
      'fractions:PRACTICE',
      'fractions:REASSESSMENT',
      'percentage:LESSON',
      'percentage:PRACTICE',
      'percentage:REASSESSMENT',
      'ratio:ADVANCE',
    ]
  );
});

test('Learner B (percentage just needs pace, not a reteach) gets a single timed-practice step, then still reaches ratio', () => {
  const syllabusOrder = ['numbers', 'percentage', 'ratio'];
  const decisionsByTopic = new Map([
    ['numbers', { action: AdaptiveAction.ADVANCE_TOPIC, reason: 'solid', context: {} }],
    ['percentage', { action: AdaptiveAction.TIMED_PRACTICE, reason: 'accurate but slow', context: {} }],
    ['ratio', { action: AdaptiveAction.ADVANCE_TOPIC, reason: 'solid', context: {} }],
  ]);

  const steps = buildAdaptiveLessonPlan(syllabusOrder, decisionsByTopic);

  assert.deepEqual(
    steps.map((s) => `${s.topicId}:${s.type}`),
    ['numbers:ADVANCE', 'percentage:TIMED_PRACTICE', 'ratio:ADVANCE']
  );
});

test('the same syllabus produces two different backend-generated plans depending only on the decision', () => {
  const syllabusOrder = ['numbers', 'percentage', 'ratio'];
  const planA = buildAdaptiveLessonPlan(
    syllabusOrder,
    new Map([
      ['numbers', { action: AdaptiveAction.ADVANCE_TOPIC, reason: '', context: {} }],
      ['percentage', { action: AdaptiveAction.PREREQUISITE_LESSON, reason: '', context: { weakestPrerequisite: { topicId: 'fractions' } } }],
      ['ratio', { action: AdaptiveAction.ADVANCE_TOPIC, reason: '', context: {} }],
    ])
  );
  const planB = buildAdaptiveLessonPlan(
    syllabusOrder,
    new Map([
      ['numbers', { action: AdaptiveAction.ADVANCE_TOPIC, reason: '', context: {} }],
      ['percentage', { action: AdaptiveAction.TIMED_PRACTICE, reason: '', context: {} }],
      ['ratio', { action: AdaptiveAction.ADVANCE_TOPIC, reason: '', context: {} }],
    ])
  );

  assert.notDeepEqual(planA, planB);
  // The defining difference from Phase 5's buildLearningPath: neither plan
  // stops at percentage's trouble — both still reach ratio.
  assert.ok(planA.some((s) => s.topicId === 'ratio'));
  assert.ok(planB.some((s) => s.topicId === 'ratio'));
});

test('a topic with no decision available is skipped, not a crash, and does not block the rest of the plan', () => {
  const steps = buildAdaptiveLessonPlan(
    ['a', 'b'],
    new Map([['b', { action: AdaptiveAction.ADVANCE_TOPIC, reason: '', context: {} }]])
  );
  assert.deepEqual(steps.map((s) => s.topicId), ['b']);
});

test('REPEAT_LESSON (a self-contained gap, no prerequisite involved) still reteaches, practices and reassesses the same topic', () => {
  const steps = buildAdaptiveLessonPlan(
    ['t'],
    new Map([['t', { action: AdaptiveAction.REPEAT_LESSON, reason: 'misconception', context: {} }]])
  );
  assert.deepEqual(
    steps.map((s) => s.type),
    [LessonPlanStepType.LESSON, LessonPlanStepType.PRACTICE, LessonPlanStepType.REASSESSMENT]
  );
  assert.ok(steps.every((s) => s.topicId === 't'));
});

test('MEMORY_ECHO, REVISION and MINI_ASSESSMENT pass through as single steps', () => {
  for (const action of [AdaptiveAction.MEMORY_ECHO, AdaptiveAction.REVISION, AdaptiveAction.MINI_ASSESSMENT]) {
    const steps = buildAdaptiveLessonPlan(['t'], new Map([['t', { action, reason: '', context: {} }]]));
    assert.equal(steps.length, 1);
    assert.equal(steps[0].type, action);
  }
});
