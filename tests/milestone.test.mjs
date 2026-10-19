import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCurrentStreak, evaluateMilestones, SEVEN_DAY_STREAK_THRESHOLD, HUNDRED_QUESTIONS_THRESHOLD } from '../src/domain/milestone.mjs';
import { MilestoneType } from '../src/domain/enums.mjs';

const today = new Date('2026-03-10T12:00:00Z');

function daysBefore(n) {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

test('a streak of 5 consecutive days including today is 5', () => {
  const dates = [daysBefore(0), daysBefore(1), daysBefore(2), daysBefore(3), daysBefore(4)];
  assert.equal(computeCurrentStreak(dates, today), 5);
});

test('no activity today does not break a streak solid through yesterday (grace period)', () => {
  const dates = [daysBefore(1), daysBefore(2), daysBefore(3)];
  assert.equal(computeCurrentStreak(dates, today), 3);
});

test('a gap more than one day breaks the streak entirely', () => {
  const dates = [daysBefore(3), daysBefore(4), daysBefore(5)]; // nothing yesterday or today
  assert.equal(computeCurrentStreak(dates, today), 0);
});

test('no activity at all is a streak of 0, not a crash', () => {
  assert.equal(computeCurrentStreak([], today), 0);
});

test('a single gap in the middle stops the count at the gap, counting only the unbroken run back from today', () => {
  const dates = [daysBefore(0), daysBefore(1), daysBefore(3), daysBefore(4)]; // missing day 2
  assert.equal(computeCurrentStreak(dates, today), 2);
});

const baseFacts = {
  firstTestEventAt: null,
  hasAnyMasteredTopic: false,
  totalQuestionAttempts: 0,
  hundredthAttemptAt: null,
  currentStreak: 0,
  topicRecovery: { found: false, achievedAt: null },
  firstPyqAttemptAt: null,
};

test('FIRST_LESSON is always locked right now, with an honest reason, never silently omitted', () => {
  const evaluations = evaluateMilestones(baseFacts);
  const firstLesson = evaluations.find((e) => e.type === MilestoneType.FIRST_LESSON);
  assert.equal(firstLesson.unlocked, false);
  assert.match(firstLesson.reason, /no lesson content/);
});

test('every known milestone type is always evaluated, never silently skipped', () => {
  const evaluations = evaluateMilestones(baseFacts);
  assert.deepEqual(
    evaluations.map((e) => e.type).sort(),
    Object.values(MilestoneType).sort()
  );
});

test('FIRST_TEST unlocks exactly when a real event timestamp exists', () => {
  const locked = evaluateMilestones(baseFacts).find((e) => e.type === MilestoneType.FIRST_TEST);
  assert.equal(locked.unlocked, false);

  const unlocked = evaluateMilestones({ ...baseFacts, firstTestEventAt: today }).find((e) => e.type === MilestoneType.FIRST_TEST);
  assert.equal(unlocked.unlocked, true);
  assert.equal(unlocked.achievedAt, today);
});

test('HUNDRED_QUESTIONS unlocks exactly at the threshold, not one short', () => {
  const short = evaluateMilestones({ ...baseFacts, totalQuestionAttempts: HUNDRED_QUESTIONS_THRESHOLD - 1 }).find(
    (e) => e.type === MilestoneType.HUNDRED_QUESTIONS
  );
  const exact = evaluateMilestones({ ...baseFacts, totalQuestionAttempts: HUNDRED_QUESTIONS_THRESHOLD, hundredthAttemptAt: today }).find(
    (e) => e.type === MilestoneType.HUNDRED_QUESTIONS
  );
  assert.equal(short.unlocked, false);
  assert.equal(exact.unlocked, true);
  assert.equal(exact.achievedAt, today);
});

test('SEVEN_DAY_STREAK unlocks exactly at the threshold', () => {
  const short = evaluateMilestones({ ...baseFacts, currentStreak: SEVEN_DAY_STREAK_THRESHOLD - 1 }).find(
    (e) => e.type === MilestoneType.SEVEN_DAY_STREAK
  );
  const exact = evaluateMilestones({ ...baseFacts, currentStreak: SEVEN_DAY_STREAK_THRESHOLD }).find(
    (e) => e.type === MilestoneType.SEVEN_DAY_STREAK
  );
  assert.equal(short.unlocked, false);
  assert.equal(exact.unlocked, true);
});

test('TOPIC_RECOVERY carries the precise real assessment timestamp when found', () => {
  const found = evaluateMilestones({ ...baseFacts, topicRecovery: { found: true, achievedAt: today } }).find(
    (e) => e.type === MilestoneType.TOPIC_RECOVERY
  );
  assert.equal(found.unlocked, true);
  assert.equal(found.achievedAt, today);
});

test('FIRST_MASTERED_TOPIC unlocks from current state with no historical timestamp claimed', () => {
  const unlocked = evaluateMilestones({ ...baseFacts, hasAnyMasteredTopic: true }).find(
    (e) => e.type === MilestoneType.FIRST_MASTERED_TOPIC
  );
  assert.equal(unlocked.unlocked, true);
  assert.equal(unlocked.achievedAt, null);
});
