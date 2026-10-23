import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyPlan, DayType } from '../src/domain/weeklyPlan.mjs';

const fullEvidence = {
  lessonAction: { topicId: 'aptitude.whole-numbers', topicName: 'Whole Numbers', reason: 'has not been started yet' },
  practiceTopic: { topicId: 'aptitude.fractions', topicName: 'Fractions', reason: 'weak' },
  revisionDueCount: 2,
  revisionTopic: { topicId: 'aptitude.percentage', topicName: 'Percentage' },
  pyqTopic: { topicId: 'aptitude.lcm', topicName: 'LCM', pyqCount: 5 },
  weakestTopicForGame: { topicId: 'aptitude.fractions', topicName: 'Fractions' },
  assessmentEligibility: { eligible: true, reason: 'exposed to 8/11 foundation topics' },
  hasCompletedDefaultAssessment: false,
};

test('with full evidence, every day gets a real, specific target', () => {
  const { days } = buildWeeklyPlan(fullEvidence);
  assert.equal(days.MONDAY.type, DayType.LESSON);
  assert.equal(days.MONDAY.topicId, 'aptitude.whole-numbers');
  assert.equal(days.TUESDAY.type, DayType.PRACTICE);
  assert.equal(days.TUESDAY.topicId, 'aptitude.fractions');
  assert.equal(days.WEDNESDAY.type, DayType.REVISION);
  assert.equal(days.WEDNESDAY.topicId, 'aptitude.percentage');
  assert.equal(days.THURSDAY.type, DayType.PYQ);
  assert.equal(days.THURSDAY.topicId, 'aptitude.lcm');
  assert.equal(days.FRIDAY.type, DayType.GAME);
  assert.equal(days.SATURDAY.type, DayType.ASSESSMENT);
  assert.equal(days.SATURDAY.assessmentType, 'DEFAULT_TEST');
  assert.equal(days.SUNDAY.type, DayType.WEEKLY_TEST);
});

test('every day type appears exactly once, Monday through Sunday', () => {
  const { days } = buildWeeklyPlan(fullEvidence);
  assert.deepEqual(Object.keys(days), ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
});

test('no lesson action (nothing gated) degrades Monday honestly, not to a fabricated topic', () => {
  const { days } = buildWeeklyPlan({ ...fullEvidence, lessonAction: null });
  assert.equal(days.MONDAY.topicId, null);
  assert.match(days.MONDAY.reason, /no foundation topic/);
});

test('no due revision degrades Wednesday to dueCount 0, not a fabricated topic', () => {
  const { days } = buildWeeklyPlan({ ...fullEvidence, revisionDueCount: 0, revisionTopic: null });
  assert.equal(days.WEDNESDAY.dueCount, 0);
  assert.equal(days.WEDNESDAY.topicId, null);
  assert.match(days.WEDNESDAY.reason, /nothing due/);
});

test('no PYQ content for her current topics degrades Thursday honestly', () => {
  const { days } = buildWeeklyPlan({ ...fullEvidence, pyqTopic: null });
  assert.equal(days.THURSDAY.topicId, null);
  assert.match(days.THURSDAY.reason, /no past-paper/);
});

test('Friday (GAME) is always marked unavailable — no game engine exists yet', () => {
  const { days } = buildWeeklyPlan(fullEvidence);
  assert.equal(days.FRIDAY.available, false);
});

test('not yet eligible for the Default Foundation Test is reflected honestly on Saturday', () => {
  const { days } = buildWeeklyPlan({
    ...fullEvidence,
    assessmentEligibility: { eligible: false, reason: 'only exposed to 2/11 foundation topics, needs 7' },
  });
  assert.equal(days.SATURDAY.assessmentType, null);
  assert.match(days.SATURDAY.reason, /not yet eligible/);
});

test('once a Default Foundation Test is already completed, Saturday recommends a mini-assessment, not another default test', () => {
  const { days } = buildWeeklyPlan({ ...fullEvidence, hasCompletedDefaultAssessment: true });
  assert.equal(days.SATURDAY.assessmentType, 'MINI_ASSESSMENT');
});

test('Sunday always points at the existing weekly test, regardless of any other evidence', () => {
  const { days } = buildWeeklyPlan({
    lessonAction: null,
    practiceTopic: null,
    revisionDueCount: 0,
    revisionTopic: null,
    pyqTopic: null,
    weakestTopicForGame: null,
    assessmentEligibility: { eligible: false, reason: 'no evidence yet' },
    hasCompletedDefaultAssessment: false,
  });
  assert.equal(days.SUNDAY.type, DayType.WEEKLY_TEST);
});
