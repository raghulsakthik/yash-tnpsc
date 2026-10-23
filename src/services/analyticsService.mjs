// Phase 28.1/28.2 — AnalyticsService. Composes real aggregates
// (analyticsRepository.mjs, this phase) with existing, unchanged reads
// (Phase 17's streak evidence, Phase 18's progression tier, Phase 24's
// decay function) into the brief's named graphs/reports. One bundled call
// (getFullAnalytics), the same bundling precedent Phase 26's
// GET /api/v1/pyq/trends already set.
import {
  buildMasteryProgression,
  buildSubjectPerformance,
  buildSpeedAccuracyQuadrant,
  buildRetentionCurve,
  buildMistakeEvolution,
  buildLearningAnalytics,
  buildPyqAnalytics,
  buildTestAnalytics,
} from '../domain/learnerAnalytics.mjs';
import { computeCurrentStreak } from '../domain/milestone.mjs';
import {
  findTestHistory,
  findTestCompletionCounts,
  findSubjectMastery,
  findTouchedTopicSpeedAccuracy,
  findStudyTimeAndCounts,
  findAverageConsistency,
  findRevisionCompletionStats,
  findPyqYearlyAccuracy,
  findPyqSubjectAccuracy,
  findPyqTopicAccuracy,
  findPyqEarlyVsRecentAccuracy,
  findMistakeCountsEarlyVsRecent,
  findAverageTimeRatio,
} from '../repository/analyticsRepository.mjs';
import { findDistinctActivityDates } from '../repository/milestoneRepository.mjs';
import { findRetentionForTopics } from '../repository/defaultAssessmentRepository.mjs';
import { getProgressionTier } from './intermediateProgressionService.mjs';
import { getDifficultyDistribution as getPyqDifficultyDistribution } from './pyqIntelligenceService.mjs';

const accuracyPercent = (correct, attempts) => (attempts > 0 ? Math.round((correct / attempts) * 10000) / 100 : null);

export async function getMasteryProgression(learnerId) {
  return buildMasteryProgression(await findTestHistory(learnerId));
}

export async function getSubjectPerformance(learnerId) {
  const rows = await findSubjectMastery(learnerId);
  return buildSubjectPerformance(rows.map((r) => ({ subjectId: r.subject_id, subjectName: r.subject_name, averageMastery: r.average_mastery })));
}

export async function getSpeedAccuracyQuadrant(learnerId) {
  const rows = await findTouchedTopicSpeedAccuracy(learnerId);
  return buildSpeedAccuracyQuadrant(rows.map((r) => ({ topicId: r.topic_id, topicName: r.topic_name, speed: r.speed, accuracy: r.accuracy })));
}

export async function getRetentionCurves(learnerId) {
  const rows = await findTouchedTopicSpeedAccuracy(learnerId); // topic_id/topic_name only needed here; speed/accuracy unused
  const retentionRows = await findRetentionForTopics(learnerId, rows.map((r) => r.topic_id));
  const retentionByTopic = new Map(retentionRows.map((r) => [r.topic_id, r.retention]));
  return rows.map((r) => ({ topicId: r.topic_id, topicName: r.topic_name, curve: buildRetentionCurve(retentionByTopic.get(r.topic_id) ?? 0) }));
}

export async function getMistakeEvolution(learnerId) {
  const rows = await findMistakeCountsEarlyVsRecent(learnerId);
  const early = Object.fromEntries(rows.map((r) => [r.mistake_type, r.early_count]));
  const recent = Object.fromEntries(rows.map((r) => [r.mistake_type, r.recent_count]));
  return buildMistakeEvolution(early, recent);
}

export async function getLearningAnalytics(learnerId) {
  const [studyRow, consistency, revisionStats, activityDates] = await Promise.all([
    findStudyTimeAndCounts(learnerId),
    findAverageConsistency(learnerId),
    findRevisionCompletionStats(learnerId),
    findDistinctActivityDates(learnerId),
  ]);
  return buildLearningAnalytics({
    studyTimeMs: studyRow.study_time_ms,
    questionsSolved: studyRow.questions_solved,
    recentAttemptsPerDay: studyRow.recent_count / 14,
    averageConsistency: consistency,
    currentStreak: computeCurrentStreak(activityDates),
    revisionCompletionRate: revisionStats.total > 0 ? revisionStats.advanced / revisionStats.total : 0,
  });
}

export async function getPyqAnalytics(learnerId) {
  const [byYearRows, bySubjectRows, byTopicRows, earlyVsRecent, difficultyDistribution] = await Promise.all([
    findPyqYearlyAccuracy(learnerId),
    findPyqSubjectAccuracy(learnerId),
    findPyqTopicAccuracy(learnerId),
    findPyqEarlyVsRecentAccuracy(learnerId),
    getPyqDifficultyDistribution(),
  ]);
  return buildPyqAnalytics({
    byYear: byYearRows.map((r) => ({ year: r.year, attempts: r.attempts, accuracy: accuracyPercent(r.correct, r.attempts) })),
    bySubject: bySubjectRows.map((r) => ({ subjectId: r.subject_id, subjectName: r.subject_name, attempts: r.attempts, accuracy: accuracyPercent(r.correct, r.attempts) })),
    byTopic: byTopicRows.map((r) => ({ topicId: r.topic_id, topicName: r.topic_name, attempts: r.attempts, accuracy: accuracyPercent(r.correct, r.attempts) })),
    difficultyDistribution,
    earlyAccuracy: accuracyPercent(earlyVsRecent.early_correct, earlyVsRecent.early_count),
    recentAccuracy: accuracyPercent(earlyVsRecent.recent_correct, earlyVsRecent.recent_count),
  });
}

export async function getTestAnalytics(learnerId) {
  const [history, counts, averageTimeRatio] = await Promise.all([findTestHistory(learnerId), findTestCompletionCounts(learnerId), findAverageTimeRatio(learnerId)]);
  const completionRate = counts.started > 0 ? counts.completed / counts.started : 0;
  return buildTestAnalytics(history, completionRate, averageTimeRatio);
}

export async function getProgression(learnerId) {
  return getProgressionTier(learnerId);
}

export async function getFullAnalytics(learnerId) {
  const [masteryProgression, subjectPerformance, speedAccuracy, retentionCurves, mistakeEvolution, learning, pyq, testAnalytics, progression] = await Promise.all([
    getMasteryProgression(learnerId),
    getSubjectPerformance(learnerId),
    getSpeedAccuracyQuadrant(learnerId),
    getRetentionCurves(learnerId),
    getMistakeEvolution(learnerId),
    getLearningAnalytics(learnerId),
    getPyqAnalytics(learnerId),
    getTestAnalytics(learnerId),
    getProgression(learnerId),
  ]);
  return { masteryProgression, subjectPerformance, speedAccuracy, retentionCurves, mistakeEvolution, learning, pyq, testAnalytics, progression };
}
