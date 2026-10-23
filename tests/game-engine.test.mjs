import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreGameAttempt, scoreGameSession, DEFAULT_SCORING_CONFIG } from '../src/domain/gameEngine.mjs';

test('a wrong answer earns nothing and resets the streak', () => {
  const result = scoreGameAttempt({ correct: false, timeTakenMs: 5000, estimatedSeconds: 30, currentStreak: 4 });
  assert.equal(result.points, 0);
  assert.equal(result.streak, 0);
});

test('a correct answer right on pace earns the base points plus the first streak bonus, no speed bonus', () => {
  const result = scoreGameAttempt({ correct: true, timeTakenMs: 30000, estimatedSeconds: 30, currentStreak: 0 });
  // ratio is exactly 1 (no speed bonus); this is the first correct answer, so streak becomes 1 -> streak bonus 1*2=2.
  assert.equal(result.points, DEFAULT_SCORING_CONFIG.pointsPerCorrect + DEFAULT_SCORING_CONFIG.streakBonusPerStreak);
});

test('a correct, fast answer earns a real speed bonus on top of the base points', () => {
  const slow = scoreGameAttempt({ correct: true, timeTakenMs: 30000, estimatedSeconds: 30, currentStreak: 0 });
  const fast = scoreGameAttempt({ correct: true, timeTakenMs: 10000, estimatedSeconds: 30, currentStreak: 0 });
  assert.ok(fast.points > slow.points, `expected fast (${fast.points}) > slow (${slow.points})`);
});

test('the streak bonus grows with consecutive correct answers but never exceeds the configured cap', () => {
  let streak = 0;
  let lastPoints = 0;
  for (let i = 0; i < 20; i += 1) {
    const result = scoreGameAttempt({ correct: true, timeTakenMs: 30000, estimatedSeconds: 30, currentStreak: streak });
    streak = result.streak;
    lastPoints = result.points;
  }
  // at the cap: base + 0 speed bonus + capped streak bonus
  assert.equal(lastPoints, DEFAULT_SCORING_CONFIG.pointsPerCorrect + DEFAULT_SCORING_CONFIG.streakBonusCap);
});

test('scoreGameSession tracks the streak across the whole session, not per-question in isolation', () => {
  const results = [
    { questionId: 'q1', correct: true, timeTakenMs: 20000, estimatedSeconds: 20 },
    { questionId: 'q2', correct: true, timeTakenMs: 20000, estimatedSeconds: 20 },
    { questionId: 'q3', correct: false, timeTakenMs: 20000, estimatedSeconds: 20 },
    { questionId: 'q4', correct: true, timeTakenMs: 20000, estimatedSeconds: 20 },
  ];
  const session = scoreGameSession(results);
  assert.equal(session.correctCount, 3);
  assert.equal(session.questionCount, 4);
  // q4 restarts the streak at 1 (q3 broke it), so its bonus should be
  // smaller than q2's (which was the 2nd consecutive correct answer).
  assert.ok(session.perQuestion[3].points < session.perQuestion[1].points);
});

test('an empty session scores zero, not a crash', () => {
  const session = scoreGameSession([]);
  assert.equal(session.totalScore, 0);
  assert.equal(session.questionCount, 0);
});
