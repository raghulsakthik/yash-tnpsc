import test from 'node:test';
import assert from 'node:assert/strict';

import { weightedAccuracy, speedScore, clamp01 } from '../src/domain/accuracy.mjs';
import { adaptDifficulty, difficultyBand, FLOOR, CEILING } from '../src/domain/difficulty.mjs';
import {
  difficultyFit,
  novelty,
  examRelevance,
  examWeight,
  selectQuestion,
  selectTopic,
  weakestPrerequisite,
} from '../src/domain/selection.mjs';
import { classifyMistake, interventionFor } from '../src/domain/mistakes.mjs';
import { earnedAchievementIds } from '../src/domain/achievements.mjs';
import { conceptScore, consistencyScore, confidenceCalibration, masteryScore } from '../src/domain/mastery.mjs';
import { recallPerformance, nextInterval, isDue, retentionValue, MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS } from '../src/domain/revision.mjs';
import { buildDailyPlan } from '../src/domain/planner.mjs';
import { allocateSlots, pickTopicQuestions } from '../src/domain/testGen.mjs';
import { topicStatus, orbitRing } from '../src/domain/progress.mjs';

const attempts = (...flags) => flags.map((correct) => ({ correct: Boolean(correct) }));

// ------------------------------------------------------------------ accuracy

test('no attempts scores zero rather than NaN', () => {
  assert.equal(weightedAccuracy([]), 0);
  assert.equal(speedScore([]), 0);
});

test('all correct is 1 and all wrong is 0', () => {
  assert.equal(weightedAccuracy(attempts(1, 1, 1, 1)), 1);
  assert.equal(weightedAccuracy(attempts(0, 0, 0, 0)), 0);
});

test('recent attempts outweigh old ones', () => {
  // Same 50% raw accuracy, opposite recent trend.
  const improving = weightedAccuracy(attempts(1, 1, 0, 0));
  const declining = weightedAccuracy(attempts(0, 0, 1, 1));

  assert.ok(improving > 0.5, `improving should read above 50%, got ${improving}`);
  assert.ok(declining < 0.5, `declining should read below 50%, got ${declining}`);
  assert.ok(improving > declining);
});

test('speed ignores fast wrong answers', () => {
  const guessedFast = speedScore([
    { correct: false, timeTakenMs: 900, expectedSeconds: 60 },
    { correct: false, timeTakenMs: 800, expectedSeconds: 60 },
  ]);
  assert.equal(guessedFast, 0, 'blasting through wrong answers must not score as fast');
});

test('answering in the expected time scores mid, twice as fast scores full', () => {
  const onPace = speedScore([{ correct: true, timeTakenMs: 60_000, expectedSeconds: 60 }]);
  const quick = speedScore([{ correct: true, timeTakenMs: 30_000, expectedSeconds: 60 }]);

  assert.ok(Math.abs(onPace - 0.5) < 0.01, `expected ~0.5, got ${onPace}`);
  assert.equal(quick, 1);
});

test('clamp01 handles NaN', () => {
  assert.equal(clamp01(NaN), 0);
  assert.equal(clamp01(-3), 0);
  assert.equal(clamp01(7), 1);
});

// ---------------------------------------------------------------- difficulty

test('difficulty holds while evidence is thin', () => {
  const result = adaptDifficulty({
    currentDifficulty: 0.3,
    accuracy: 1,
    speed: 1,
    consecutiveWrong: 0,
    attemptCount: 2,
  });
  assert.equal(result.difficulty, 0.3, 'must not jump on 2 attempts');
  assert.equal(result.nextAction, 'PRACTICE');
});

test('sustained accuracy with speed steps difficulty up', () => {
  const result = adaptDifficulty({
    currentDifficulty: 0.4,
    accuracy: 0.9,
    speed: 0.6,
    consecutiveWrong: 0,
    attemptCount: 12,
  });
  assert.equal(result.difficulty, 0.45);
  assert.equal(result.nextAction, 'HARDER_QUESTION');
});

test('accurate but slow holds difficulty instead of raising it', () => {
  const result = adaptDifficulty({
    currentDifficulty: 0.4,
    accuracy: 0.9,
    speed: 0.2,
    consecutiveWrong: 0,
    attemptCount: 12,
  });
  assert.equal(result.difficulty, 0.4);
  assert.match(result.reason, /slow/);
});

test('low accuracy steps down', () => {
  const result = adaptDifficulty({
    currentDifficulty: 0.5,
    accuracy: 0.3,
    speed: 0.5,
    consecutiveWrong: 1,
    attemptCount: 12,
  });
  assert.equal(result.difficulty, 0.4);
  assert.equal(result.nextAction, 'EASIER_QUESTION');
});

test('three wrong in a row overrides everything and checks the prerequisite', () => {
  const result = adaptDifficulty({
    currentDifficulty: 0.6,
    accuracy: 0.9, // stale: the streak is the real signal
    speed: 0.9,
    consecutiveWrong: 3,
    attemptCount: 30,
  });
  assert.equal(result.nextAction, 'REVIEW_PREREQUISITE');
  assert.ok(result.difficulty < 0.6);
});

test('difficulty never escapes its bounds', () => {
  const bottom = adaptDifficulty({
    currentDifficulty: FLOOR,
    accuracy: 0,
    speed: 0,
    consecutiveWrong: 1,
    attemptCount: 50,
  });
  const top = adaptDifficulty({
    currentDifficulty: CEILING,
    accuracy: 1,
    speed: 1,
    consecutiveWrong: 0,
    attemptCount: 50,
  });
  assert.ok(bottom.difficulty >= FLOOR);
  assert.ok(top.difficulty <= CEILING);
});

test('bands are for display only', () => {
  assert.equal(difficultyBand(0.2), 'EASY');
  assert.equal(difficultyBand(0.5), 'MEDIUM');
  assert.equal(difficultyBand(0.7), 'HARD');
  assert.equal(difficultyBand(0.9), 'EXPERT');
});

// ----------------------------------------------------------------- selection

test('difficulty fit peaks at an exact match', () => {
  assert.equal(difficultyFit(0.5, 0.5), 1);
  assert.ok(difficultyFit(0.6, 0.5) > difficultyFit(0.75, 0.5));
  assert.equal(difficultyFit(0.95, 0.5), 0, 'far-off questions score nothing');
});

test('unseen questions are preferred, but seen ones come back eventually', () => {
  assert.equal(novelty(0, 0), 1);
  const justSeen = novelty(1, 0);
  const longAgo = novelty(1, 40);
  assert.ok(justSeen < 0.4);
  assert.ok(longAgo > justSeen, 'a question seen 40 attempts ago is usable again');
});

test('past paper questions outrank authored ones', () => {
  assert.equal(examRelevance('tnpsc-2022-prelims'), 1);
  assert.ok(examRelevance('textbook') > examRelevance('authored'));
});

test('selection prefers the right difficulty over a stale favourite', () => {
  const chosen = selectQuestion(
    [
      { id: 'too-easy', difficulty: 0.1, source: 'tnpsc-2022', seenCount: 0 },
      { id: 'just-right', difficulty: 0.45, source: 'authored', seenCount: 0 },
      { id: 'seen-often', difficulty: 0.45, source: 'tnpsc-2022', seenCount: 6, attemptsSinceLastSeen: 1 },
    ],
    0.45
  );
  assert.equal(chosen.id, 'just-right');
});

test('selection returns null on an empty bank rather than throwing', () => {
  assert.equal(selectQuestion([], 0.5), null);
  assert.equal(selectTopic([]), null);
});

test('exam weight comes from the real question counts', () => {
  // Indian Polity: 15 questions over 20 topics. TN History: 20 over 20.
  const polity = examWeight(15, 20, 20);
  const tnHistory = examWeight(20, 20, 20);
  const foundation = examWeight(0, 4, 20);

  assert.ok(tnHistory > polity);
  assert.equal(foundation, 0, 'unexamined prerequisite topics carry no exam weight');
});

test('an untouched topic is explored, not treated as mastered', () => {
  const chosen = selectTopic([
    { id: 'done-well', accuracy: 0.95, examWeight: 0.9, attemptCount: 40 },
    { id: 'untouched', accuracy: 0, examWeight: 0.9, attemptCount: 0 },
  ]);
  assert.equal(chosen.id, 'untouched');
});

test('prerequisite walk finds the root cause, not the nearest parent', () => {
  const graph = new Map([
    ['aptitude.percentage', [{ id: 'aptitude.fractions', strength: 0.85 }]],
    ['aptitude.fractions', [{ id: 'aptitude.division', strength: 0.85 }]],
    ['aptitude.division', []],
  ]);
  const accuracy = new Map([
    ['aptitude.fractions', 0.65],
    ['aptitude.division', 0.2],
  ]);

  const weakest = weakestPrerequisite('aptitude.percentage', graph, accuracy);
  assert.equal(weakest.topicId, 'aptitude.division');
});

test('prerequisite walk returns null when the foundations are solid', () => {
  const graph = new Map([['aptitude.percentage', [{ id: 'aptitude.fractions', strength: 0.85 }]]]);
  const accuracy = new Map([['aptitude.fractions', 0.92]]);
  assert.equal(weakestPrerequisite('aptitude.percentage', graph, accuracy), null);
});

test('prerequisite walk terminates on a cyclic graph', () => {
  const graph = new Map([
    ['a', [{ id: 'b', strength: 1 }]],
    ['b', [{ id: 'a', strength: 1 }]],
  ]);
  const weakest = weakestPrerequisite('a', graph, new Map([['b', 0.1]]));
  assert.equal(weakest.topicId, 'b');
});

// ------------------------------------------------------------------ mistakes

test('correct answers are not classified', () => {
  assert.equal(
    classifyMistake({ correct: true, timeTakenMs: 1000, expectedSeconds: 60, confidence: 3, topicAccuracy: 0.5 }),
    null
  );
});

test('an instant wrong answer is a guess', () => {
  const type = classifyMistake({
    correct: false,
    timeTakenMs: 2000,
    expectedSeconds: 60,
    confidence: 2,
    topicAccuracy: 0.5,
  });
  assert.equal(type, 'GUESS');
  assert.equal(interventionFor(type).action, 'RETRY_SAME');
});

test('confident and wrong is flagged above everything else', () => {
  const type = classifyMistake({
    correct: false,
    timeTakenMs: 40_000,
    expectedSeconds: 60,
    confidence: 5,
    topicAccuracy: 0.8,
  });
  assert.equal(type, 'OVERCONFIDENT');
  assert.equal(interventionFor(type).action, 'SHOW_EXPLANATION');
});

test('strong topic plus normal pace reads as careless, weak topic as conceptual', () => {
  const base = { correct: false, timeTakenMs: 50_000, expectedSeconds: 60, confidence: 2 };
  assert.equal(classifyMistake({ ...base, topicAccuracy: 0.8 }), 'CARELESS');
  assert.equal(classifyMistake({ ...base, topicAccuracy: 0.3 }), 'CONCEPTUAL');
});

test('a long slog to a wrong answer is time pressure, not carelessness', () => {
  const type = classifyMistake({
    correct: false,
    timeTakenMs: 200_000,
    expectedSeconds: 60,
    confidence: 2,
    topicAccuracy: 0.8,
  });
  assert.equal(type, 'TIME_PRESSURE');
});

test('every mistake type has a deterministic intervention', () => {
  for (const type of ['GUESS', 'OVERCONFIDENT', 'TIME_PRESSURE', 'CARELESS', 'CONCEPTUAL', 'UNKNOWN']) {
    const intervention = interventionFor(type);
    assert.ok(intervention.action, `${type} needs an action`);
    assert.ok(intervention.message.length > 0, `${type} needs a message that works with no AI`);
  }
});

// ------------------------------------------------------------------- mastery

test('concept score is lifetime accuracy, zero with no attempts', () => {
  assert.equal(conceptScore(0, 0), 0);
  assert.equal(conceptScore(8, 10), 0.8);
  assert.equal(conceptScore(10, 10), 1);
});

test('consistency score is high for a steady run and low for alternating results', () => {
  const steady = consistencyScore([{ correct: true }, { correct: true }, { correct: true }, { correct: true }]);
  const alternating = consistencyScore([{ correct: true }, { correct: false }, { correct: true }, { correct: false }]);
  assert.ok(steady > alternating, `steady (${steady}) should read more consistent than alternating (${alternating})`);
  assert.equal(alternating, 0, 'maximum variance (50/50 split) scores zero consistency');
});

test('consistency needs at least two attempts to mean anything', () => {
  assert.equal(consistencyScore([]), 0);
  assert.equal(consistencyScore([{ correct: true }]), 0);
});

test('confidence calibration rewards confident-and-right, punishes confident-and-wrong', () => {
  const wellCalibrated = confidenceCalibration([
    { correct: true, confidence: 5 },
    { correct: false, confidence: 1 },
  ]);
  const overconfident = confidenceCalibration([
    { correct: false, confidence: 5 },
    { correct: false, confidence: 5 },
  ]);
  assert.ok(wellCalibrated > overconfident);
  assert.equal(confidenceCalibration([]), 0);
});

test('mastery score blends all six dimensions and stays in bounds', () => {
  const perfect = masteryScore({
    concept: 1,
    accuracy: 1,
    speed: 1,
    retention: 1,
    consistency: 1,
    confidence: 1,
  });
  const zero = masteryScore({ concept: 0, accuracy: 0, speed: 0, retention: 0, consistency: 0, confidence: 0 });
  assert.equal(perfect, 1);
  assert.equal(zero, 0);

  const mixed = masteryScore({
    concept: 0.8,
    accuracy: 0.7,
    speed: 0.5,
    retention: 0.6,
    consistency: 0.9,
    confidence: 0.4,
  });
  assert.ok(mixed > 0 && mixed < 1);
});

// ------------------------------------------------------------------ revision

test('a clean, confident, correct answer recalls as GOOD', () => {
  const type = recallPerformance({ correct: true, timeTakenMs: 20_000, expectedSeconds: 60, confidence: 4 });
  assert.equal(type, 'GOOD');
});

test('correct but slow or unsure recalls as MEDIUM', () => {
  const slow = recallPerformance({ correct: true, timeTakenMs: 200_000, expectedSeconds: 60, confidence: 4 });
  const unsure = recallPerformance({ correct: true, timeTakenMs: 20_000, expectedSeconds: 60, confidence: 2 });
  assert.equal(slow, 'MEDIUM');
  assert.equal(unsure, 'MEDIUM');
});

test('a wrong answer always recalls as POOR, regardless of pace or confidence', () => {
  assert.equal(recallPerformance({ correct: false, timeTakenMs: 1000, expectedSeconds: 60, confidence: 5 }), 'POOR');
});

test('interval doubles on GOOD, grows a little on MEDIUM, halves on POOR', () => {
  assert.equal(nextInterval(10, 'GOOD'), 20);
  assert.equal(nextInterval(10, 'MEDIUM'), 13);
  assert.equal(nextInterval(10, 'POOR'), 5);
});

test('interval is bounded between 1 and 90 days', () => {
  assert.equal(nextInterval(1, 'POOR'), MIN_INTERVAL_DAYS);
  assert.equal(nextInterval(80, 'GOOD'), MAX_INTERVAL_DAYS);
});

test('isDue compares against now, not wall-clock assumptions', () => {
  const now = new Date('2026-01-10T00:00:00Z');
  assert.ok(isDue('2026-01-09T00:00:00Z', now));
  assert.ok(isDue('2026-01-10T00:00:00Z', now), 'exactly due counts as due');
  assert.ok(!isDue('2026-01-11T00:00:00Z', now));
  assert.ok(!isDue(null, now));
});

test('retention value ranks GOOD above MEDIUM above POOR', () => {
  assert.ok(retentionValue('GOOD') > retentionValue('MEDIUM'));
  assert.ok(retentionValue('MEDIUM') > retentionValue('POOR'));
});

// ------------------------------------------------------------------- planner

test('revision takes priority over new practice when something is overdue', () => {
  const plan = buildDailyPlan({
    topics: [],
    revisionDueCount: 3,
    selectedTopic: { id: 'aptitude.percentage', name: 'Percentage', attemptCount: 5 },
  });
  assert.equal(plan.primaryAction, 'MEMORY_ECHO');
  assert.equal(plan.revisionDue, 3);
  assert.ok(plan.estimatedMinutes > 0);
});

test('with nothing due, the selected topic becomes the primary action', () => {
  const plan = buildDailyPlan({
    topics: [],
    revisionDueCount: 0,
    selectedTopic: { id: 'aptitude.fractions', name: 'Fractions', attemptCount: 0 },
  });
  assert.equal(plan.primaryAction, 'PRACTICE');
  assert.equal(plan.topicId, 'aptitude.fractions');
  assert.match(plan.reason, /not been started/);
});

test('with no due revision and no topic, the plan says so rather than guessing', () => {
  const plan = buildDailyPlan({ topics: [], revisionDueCount: 0, selectedTopic: null });
  assert.equal(plan.primaryAction, 'NONE');
  assert.equal(plan.topicId, null);
});

// ------------------------------------------------------------------ testGen

test('allocateSlots sums to exactly the target, matching the real exam split', () => {
  // apt.aptitude: 15 questions over 10 topics. apt.reasoning: 10 over 6.
  const shares = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `apt-${i}`, share: 15 / 10 })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `rsn-${i}`, share: 10 / 6 })),
  ];
  const slots = allocateSlots(shares, 25);
  const total = [...slots.values()].reduce((sum, n) => sum + n, 0);
  assert.equal(total, 25);
  assert.equal(slots.size, 16);
  for (const n of slots.values()) assert.ok(n >= 1, 'every examined topic gets at least one slot');
});

test('allocateSlots handles an empty or zero-total input without throwing', () => {
  assert.equal(allocateSlots([], 25).size, 0);
  assert.equal(allocateSlots([{ id: 'a', share: 1 }], 0).size, 0);
  assert.equal(allocateSlots([{ id: 'a', share: 0 }], 25).size, 0);
});

test('allocateSlots splits an even split down the middle', () => {
  const slots = allocateSlots(
    [
      { id: 'a', share: 1 },
      { id: 'b', share: 1 },
    ],
    10
  );
  assert.equal(slots.get('a'), 5);
  assert.equal(slots.get('b'), 5);
});

test('pickTopicQuestions returns everything when the bank is smaller than the count', () => {
  const questions = [{ id: 'q1', difficulty: 0.2 }, { id: 'q2', difficulty: 0.5 }];
  const picked = pickTopicQuestions(questions, 5);
  assert.equal(picked.length, 2);
});

test('pickTopicQuestions prefers unseen questions over seen ones', () => {
  const questions = [
    { id: 'seen-1', difficulty: 0.3 },
    { id: 'unseen-1', difficulty: 0.3 },
    { id: 'seen-2', difficulty: 0.3 },
    { id: 'unseen-2', difficulty: 0.3 },
  ];
  const seenIds = new Set(['seen-1', 'seen-2']);
  const picked = pickTopicQuestions(questions, 2, seenIds);
  assert.ok(picked.every((q) => q.id.startsWith('unseen')), 'both picks should be unseen questions');
});

test('pickTopicQuestions spreads picks across the difficulty range', () => {
  const questions = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, difficulty: i / 10 }));
  const picked = pickTopicQuestions(questions, 5);
  const difficulties = picked.map((q) => q.difficulty);
  assert.equal(difficulties[0], 0, 'first pick should be from the easy end');
  assert.ok(difficulties[difficulties.length - 1] >= 0.8, 'last pick should be from the hard end');
});

test('topicStatus: zero attempts is not-started regardless of mastery', () => {
  assert.equal(topicStatus({ attemptCount: 0, masteryScore: 0.9, revisionDue: false }), 'not-started');
});

test('topicStatus: a due revision outranks a high mastery score', () => {
  assert.equal(topicStatus({ attemptCount: 5, masteryScore: 0.9, revisionDue: true }), 'revision-due');
});

test('topicStatus: mastered vs retained depends on interval length', () => {
  assert.equal(topicStatus({ attemptCount: 5, masteryScore: 0.9, revisionDue: false, intervalDays: 7 }), 'mastered');
  assert.equal(topicStatus({ attemptCount: 5, masteryScore: 0.9, revisionDue: false, intervalDays: 30 }), 'retained');
});

test('topicStatus: mid-range scores land on near-mastery, practising or learning', () => {
  assert.equal(topicStatus({ attemptCount: 3, masteryScore: 0.75, revisionDue: false }), 'near-mastery');
  assert.equal(topicStatus({ attemptCount: 3, masteryScore: 0.5, revisionDue: false }), 'practising');
  assert.equal(topicStatus({ attemptCount: 3, masteryScore: 0.1, revisionDue: false }), 'learning');
});

test('orbitRing collapses the eight states into the five orbit rings', () => {
  assert.equal(orbitRing('mastered'), 'mastered');
  assert.equal(orbitRing('retained'), 'mastered');
  assert.equal(orbitRing('near-mastery'), 'learning');
  assert.equal(orbitRing('practising'), 'learning');
  assert.equal(orbitRing('revision-due'), 'drifting');
  assert.equal(orbitRing('learning'), 'struggling');
  assert.equal(orbitRing('not-started'), 'unmet');
});

test('earnedAchievementIds: a brand-new learner earns nothing', () => {
  const zero = { questionsSolved: 0, streak: 0, topicsMastered: 0, testsCompleted: 0, bestTestScore: 0, mistakesCleared: 0 };
  assert.deepEqual(earnedAchievementIds(zero), []);
});

test('earnedAchievementIds: thresholds are inclusive and each tier implies the ones below it', () => {
  const stats = { questionsSolved: 100, streak: 7, topicsMastered: 1, testsCompleted: 1, bestTestScore: 85, mistakesCleared: 0 };
  const ids = earnedAchievementIds(stats);
  assert.ok(ids.includes('first-step'));
  assert.ok(ids.includes('streak-3'));
  assert.ok(ids.includes('streak-7'));
  assert.ok(!ids.includes('streak-30'));
  assert.ok(ids.includes('hundred-questions'));
  assert.ok(!ids.includes('five-hundred-questions'));
  assert.ok(ids.includes('first-topic-mastered'));
  assert.ok(!ids.includes('five-topics-mastered'));
  assert.ok(ids.includes('high-scorer'));
  assert.ok(!ids.includes('clean-sweep'));
});

test('earnedAchievementIds: a perfect test score earns clean-sweep but not high-scorer twice', () => {
  const stats = { questionsSolved: 0, streak: 0, topicsMastered: 0, testsCompleted: 1, bestTestScore: 100, mistakesCleared: 10 };
  const ids = earnedAchievementIds(stats);
  assert.ok(ids.includes('high-scorer'));
  assert.ok(ids.includes('clean-sweep'));
  assert.ok(ids.includes('mistake-fixer'));
});
