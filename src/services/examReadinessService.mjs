// Phase 28.3 — ExamReadinessService. Every signal is read from a phase
// that already computes it — mastery/retention/speed/confidence
// (learner_topic_state, Phase 1), PYQ performance (Phase 21), mock-test
// performance and recent trend (this phase's own real test history),
// subject coverage (this phase), consistency (Phase 1). Nothing here
// recomputes a score another module owns; this only weighs and persists a
// comparable snapshot.
import { computeExamReadinessIndex, explainReadinessChange } from '../domain/examReadiness.mjs';
import { buildSubjectPerformance } from '../domain/learnerAnalytics.mjs';
import {
  findAverageMastery,
  findAverageConsistency,
  findSubjectCoverage,
  findTouchedSubjectCount,
  findSubjectMastery,
  findTestHistory,
} from '../repository/analyticsRepository.mjs';
import { getPyqPerformanceSummary } from './pyqService.mjs';
import { getTestAnalytics } from './analyticsService.mjs';
import { findLatestReadinessSnapshot, insertReadinessSnapshot } from '../repository/readinessSnapshotRepository.mjs';

const TREND_SIGNAL = { IMPROVING: 1, STABLE: 0.5, DECLINING: 0, INSUFFICIENT_DATA: 0.5 };
const RECENT_MOCK_TEST_WINDOW = 5;

export async function getExamReadiness(learnerId) {
  const [mastery, consistency, subjectsWithContent, touchedSubjects, pyqPerformance, testAnalytics, subjectMasteryRows, history] = await Promise.all([
    findAverageMastery(learnerId),
    findAverageConsistency(learnerId),
    findSubjectCoverage(),
    findTouchedSubjectCount(learnerId),
    getPyqPerformanceSummary(learnerId),
    getTestAnalytics(learnerId),
    findSubjectMastery(learnerId),
    findTestHistory(learnerId),
  ]);

  const recentScores = history.slice(-RECENT_MOCK_TEST_WINDOW).map((t) => t.score);
  const mockTestPerformance = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length / 100 : 0;

  const signals = {
    mastery: mastery.avg_mastery ?? 0,
    pyqPerformance: pyqPerformance.overall.pyq.accuracy !== null ? pyqPerformance.overall.pyq.accuracy / 100 : 0,
    mockTestPerformance,
    recentTrend: TREND_SIGNAL[testAnalytics.scoreTrend] ?? 0.5,
    retention: mastery.avg_retention ?? 0,
    speed: mastery.avg_speed ?? 0,
    confidenceCalibration: mastery.avg_confidence ?? 0,
    subjectCoverage: subjectsWithContent > 0 ? touchedSubjects / subjectsWithContent : 0,
    consistency: consistency ?? 0,
  };

  const index = computeExamReadinessIndex(signals);
  const previous = await findLatestReadinessSnapshot(learnerId);
  const explanation = explainReadinessChange(index, previous ? { overall: previous.overall_score, breakdown: previous.breakdown } : null);

  await insertReadinessSnapshot({ learnerId, overallScore: index.overall, breakdown: index.breakdown });

  const bySubject = buildSubjectPerformance(
    subjectMasteryRows.map((r) => ({ subjectId: r.subject_id, subjectName: r.subject_name, averageMastery: r.average_mastery }))
  );

  return {
    overall: index.overall,
    label: index.label,
    breakdown: index.breakdown,
    bySubject,
    explanation,
    disclaimer: 'This is a readiness index, not a guaranteed pass probability.',
  };
}
