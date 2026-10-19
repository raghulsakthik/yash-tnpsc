/**
 * Phase 28.1/28.2 — Learner Analytics Engine & Graph Data. Every function
 * here is pure shaping over real aggregates the repository layer computed
 * (test history, per-topic speed/accuracy, PYQ performance) — nothing
 * recomputes a score another phase already owns.
 */

import { clamp01 } from './accuracy.mjs';
import { timeDecayFactor } from './retentionEngine.mjs';

// -------------------------------------------------------- Graph 1: mastery progression

/**
 * @param {Array<{id: string, type: string, score: number, completedAt: string}>} testHistory oldest first
 */
export function buildMasteryProgression(testHistory) {
  return testHistory.map((t, i) => ({
    testIndex: i + 1,
    label: `Test ${i + 1}`,
    testId: t.id,
    type: t.type,
    score: t.score,
    completedAt: t.completedAt,
  }));
}

// -------------------------------------------------------- Graph 2: subject performance

/**
 * @param {Array<{subjectId: string, subjectName: string, averageMastery: number}>} rows
 */
export function buildSubjectPerformance(rows) {
  return rows.map((r) => ({ ...r, masteryPercent: Math.round(r.averageMastery * 10000) / 100 })).sort((a, b) => b.masteryPercent - a.masteryPercent);
}

// -------------------------------------------------------- Graph 3: speed vs accuracy

export const SPEED_ACCURACY_CONFIG = { fastSpeedFloor: 0.6, accurateAccuracyFloor: 0.7 };

/**
 * @param {number} speed 0..1 (speedScore, accuracy.mjs, unchanged)
 * @param {number} accuracy 0..1
 */
export function classifySpeedAccuracyQuadrant(speed, accuracy) {
  const cfg = SPEED_ACCURACY_CONFIG;
  const fast = speed >= cfg.fastSpeedFloor;
  const accurate = accuracy >= cfg.accurateAccuracyFloor;
  if (fast && accurate) return 'STRONG';
  if (fast && !accurate) return 'CARELESS_OR_GUESSING';
  if (!fast && accurate) return 'SPEED_TRAINING';
  return 'CONCEPT_INTERVENTION';
}

/**
 * @param {Array<{topicId: string, topicName: string, speed: number, accuracy: number}>} topics
 */
export function buildSpeedAccuracyQuadrant(topics) {
  return topics.map((t) => ({ ...t, quadrant: classifySpeedAccuracyQuadrant(t.speed, t.accuracy) }));
}

// -------------------------------------------------------- Graph 4: retention curve

export const RETENTION_CURVE_DAYS = [1, 3, 7, 14, 30];

/**
 * Projects a real stored retention score through the real, unchanged
 * decay function (retentionEngine.mjs, Phase 24) at the brief's named day
 * offsets — not a new model, the same one already governing recommendations.
 *
 * @param {number} storedRetention
 */
export function buildRetentionCurve(storedRetention) {
  return RETENTION_CURVE_DAYS.map((days) => ({
    days,
    projectedRetention: Math.round(clamp01(storedRetention * timeDecayFactor(days)) * 1000) / 1000,
  }));
}

// -------------------------------------------------------- Graph 5: mistake evolution

const MISTAKE_TYPES = ['CONCEPTUAL', 'CARELESS', 'GUESS', 'TIME_PRESSURE', 'OVERCONFIDENT', 'UNKNOWN'];

/**
 * @param {Record<string, number>} earlyCounts mistake-type counts from her chronologically earlier attempts
 * @param {Record<string, number>} recentCounts the same, from her chronologically later attempts
 */
export function buildMistakeEvolution(earlyCounts, recentCounts) {
  return MISTAKE_TYPES.map((type) => {
    const early = earlyCounts[type] ?? 0;
    const recent = recentCounts[type] ?? 0;
    const direction = recent < early ? 'DOWN' : recent > early ? 'UP' : 'FLAT';
    return { type, early, recent, direction };
  });
}

// -------------------------------------------------------- learning / PYQ / test analytics

/**
 * @param {object} input real aggregates from the repository layer
 */
export function buildLearningAnalytics({ studyTimeMs, questionsSolved, recentAttemptsPerDay, averageConsistency, currentStreak, revisionCompletionRate }) {
  return {
    studyTimeMinutes: Math.round(studyTimeMs / 60000),
    questionsSolved,
    // A system-level rate (recent attempts per day), distinct from Phase
    // 6's own per-topic learningVelocity signal — that one is read-time,
    // per-topic, and expensive to aggregate across every touched topic;
    // this is a real, separate, honestly-named metric.
    recentAttemptsPerDay: Math.round(recentAttemptsPerDay * 100) / 100,
    averageConsistency: averageConsistency === null ? null : Math.round(averageConsistency * 1000) / 1000,
    currentStreak,
    revisionCompletionRate: Math.round(revisionCompletionRate * 1000) / 1000,
  };
}

/**
 * @param {object} input
 */
export function buildPyqAnalytics({ byYear, bySubject, byTopic, difficultyDistribution, earlyAccuracy, recentAccuracy }) {
  const improvement = earlyAccuracy === null || recentAccuracy === null ? null : Math.round((recentAccuracy - earlyAccuracy) * 100) / 100;
  return {
    byYear,
    bySubject,
    byTopic,
    difficultyDistribution,
    earlyAccuracy,
    recentAccuracy,
    improvement,
    disclaimer: improvement === null ? 'not enough real PYQ attempts yet to compare early vs recent performance' : undefined,
  };
}

/**
 * @param {Array<object>} testHistory oldest first, {score, completedAt}
 * @param {number} completionRate real completed / (completed + abandoned)
 * @param {number|null} averageTimeRatio real avg(timeTaken / estimatedSeconds) across her attempts
 */
export function buildTestAnalytics(testHistory, completionRate, averageTimeRatio) {
  const scores = testHistory.map((t) => t.score);
  const scoreTrend = scores.length < 2 ? 'INSUFFICIENT_DATA' : scores[scores.length - 1] > scores[0] ? 'IMPROVING' : scores[scores.length - 1] < scores[0] ? 'DECLINING' : 'STABLE';
  return {
    testsCompleted: testHistory.length,
    scoreTrend,
    completionRate: Math.round(completionRate * 1000) / 1000,
    averageTimeRatio: averageTimeRatio === null ? null : Math.round(averageTimeRatio * 100) / 100,
    timeManagement: averageTimeRatio === null ? 'UNKNOWN' : averageTimeRatio > 1.3 ? 'SLOW' : averageTimeRatio < 0.6 ? 'RUSHING' : 'ON_PACE',
  };
}
