import { clamp01 } from './accuracy.mjs';

/**
 * Milestone definitions — a static list, each a pure isEarned(aggregates)
 * check (plus an honest 0..1 progress()) over data already computed
 * elsewhere (journey/PYQ/test/quick-lab overviews). No milestone here
 * invents a signal nothing else tracks.
 *
 * @typedef {object} Aggregates
 * @property {number} attemptCount lifetime question_attempt rows
 * @property {number} topicsMastered
 * @property {number} longestStreak
 * @property {number} topicsRetained mastered AND retention_score >= 0.8
 * @property {number} completedTests
 * @property {number} highestTestScorePct 0..100, 0 if none completed
 * @property {number} pyqsAttempted
 * @property {number} quickLabQuestionsAnswered across all completed rounds
 */

const toward = (value, goal) => clamp01(goal > 0 ? value / goal : 0);

export const MILESTONE_DEFINITIONS = [
  {
    id: 'first-steps',
    name: 'First steps',
    note: 'Answered your first question',
    isEarned: (a) => a.attemptCount >= 1,
    progress: (a) => (a.attemptCount >= 1 ? 1 : 0),
  },
  {
    id: 'foundation-builder',
    name: 'Foundation builder',
    note: 'Five topics mastered',
    isEarned: (a) => a.topicsMastered >= 5,
    progress: (a) => toward(a.topicsMastered, 5),
  },
  {
    id: 'consistent-learner',
    name: 'Consistent learner',
    note: 'Seven-day learning streak',
    isEarned: (a) => a.longestStreak >= 7,
    progress: (a) => toward(a.longestStreak, 7),
  },
  {
    id: 'test-ready',
    name: 'Test ready',
    note: 'Completed your first full test',
    isEarned: (a) => a.completedTests >= 1,
    progress: (a) => (a.completedTests >= 1 ? 1 : 0),
  },
  {
    id: 'pyq-explorer',
    name: 'PYQ explorer',
    note: 'First 50 previous-year questions',
    isEarned: (a) => a.pyqsAttempted >= 50,
    progress: (a) => toward(a.pyqsAttempted, 50),
  },
  {
    id: 'speed-builder',
    name: 'Speed builder',
    note: '50 timed Quick Lab questions solved',
    isEarned: (a) => a.quickLabQuestionsAnswered >= 50,
    progress: (a) => toward(a.quickLabQuestionsAnswered, 50),
  },
  {
    id: 'memory-keeper',
    name: 'Memory keeper',
    note: '20 topics retained (mastered and holding)',
    isEarned: (a) => a.topicsRetained >= 20,
    progress: (a) => toward(a.topicsRetained, 20),
  },
  {
    id: 'ninety-percent-test',
    name: '90% test score',
    note: 'A weekly test at 90% or above',
    isEarned: (a) => a.highestTestScorePct >= 90,
    progress: (a) => toward(a.highestTestScorePct, 90),
  },
  {
    id: 'thirty-day-streak',
    name: 'Thirty-day streak',
    note: 'A month of genuine daily learning',
    isEarned: (a) => a.longestStreak >= 30,
    progress: (a) => toward(a.longestStreak, 30),
  },
];
