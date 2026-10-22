import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStreak,
  getUserLevelInfo,
  calculateCourseProgress,
  getGreeting,
  generateYearActivityData,
  calculateDailyGoalProgress,
} from './learningStats';

test('calculateStreak counts consecutive active days correctly', () => {
  const activities = [
    { date: '2026-10-22', count: 3, level: 2 },
    { date: '2026-10-21', count: 1, level: 1 },
    { date: '2026-10-20', count: 4, level: 3 },
    { date: '2026-10-19', count: 0, level: 0 },
    { date: '2026-10-18', count: 5, level: 4 },
  ];
  assert.equal(calculateStreak(activities), 3);
});

test('calculateStreak returns 0 when no activities exist', () => {
  assert.equal(calculateStreak([]), 0);
});

test('getUserLevelInfo calculates levels and percentages accurately', () => {
  const beginner = getUserLevelInfo(1000);
  assert.equal(beginner.level, 'Beginner');
  assert.equal(beginner.percentage, 50);

  const intermediate = getUserLevelInfo(3500);
  assert.equal(intermediate.level, 'Intermediate');
  assert.equal(intermediate.percentage, 50);

  const advanced = getUserLevelInfo(7500);
  assert.equal(advanced.level, 'Advanced');
  assert.equal(advanced.percentage, 50);
});

test('calculateCourseProgress computes completion % based on finished lessons', () => {
  const lessons = [
    { id: '1', title: 'A', duration: '10m', completed: true, description: '' },
    { id: '2', title: 'B', duration: '15m', completed: true, description: '' },
    { id: '3', title: 'C', duration: '20m', completed: false, description: '' },
    { id: '4', title: 'D', duration: '10m', completed: false, description: '' },
  ];
  assert.equal(calculateCourseProgress(lessons), 50);

  // All completed
  const allDone = lessons.map(l => ({ ...l, completed: true }));
  assert.equal(calculateCourseProgress(allDone), 100);
});

test('getGreeting provides appropriate time-based greeting', () => {
  assert.equal(getGreeting('Yashika', 10), 'Good Morning, Yashika');
  assert.equal(getGreeting('Yashika', 14), 'Good Afternoon, Yashika');
  assert.equal(getGreeting('Yashika', 19), 'Good Evening, Yashika');
  assert.equal(getGreeting('Yashika', 23), 'Good Night, Yashika');
});

test('generateYearActivityData produces 365 items with valid dates', () => {
  const data = generateYearActivityData(365);
  assert.equal(data.length, 365);
  assert.ok(data[0].date.length > 0);
  assert.ok(data[data.length - 1].level >= 0);
});

test('calculateDailyGoalProgress computes percentage and completion state correctly', () => {
  const inProgress = calculateDailyGoalProgress(1.5, 2.0);
  assert.equal(inProgress.percentage, 75);
  assert.equal(inProgress.isCompleted, false);
  assert.equal(inProgress.remaining, 0.5);

  const completed = calculateDailyGoalProgress(3, 3);
  assert.equal(completed.percentage, 100);
  assert.equal(completed.isCompleted, true);
  assert.equal(completed.remaining, 0);

  const exceeded = calculateDailyGoalProgress(4, 2);
  assert.equal(exceeded.percentage, 100);
  assert.equal(exceeded.isCompleted, true);
  assert.equal(exceeded.remaining, 0);

  const zeroTarget = calculateDailyGoalProgress(1, 0);
  assert.equal(zeroTarget.percentage, 0);
  assert.equal(zeroTarget.isCompleted, false);
});

