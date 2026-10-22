import { computeExamReadinessIndex, explainReadinessChange, EXAM_READINESS_DISCLAIMER } from '../domain/examReadiness.mjs';
import { getReadinessEvidence, getLatestReadinessSnapshot, saveReadinessSnapshot } from '../repository/readinessRepository.mjs';

export async function getExamReadiness(learnerId) {
  const evidence = await getReadinessEvidence(learnerId);
  const mastery = evidence.mastery;
  const tests = evidence.tests;
  const pyq = evidence.pyq;
  const recentTestSignal = Number(tests.completed) > 0 ? Number(tests.latest_score) / 100 : 0;
  const trend = Number(tests.completed) < 2 ? 0.5 : Number(tests.latest_score) >= Number(tests.avg_score) ? 1 : 0;
  const signals = {
    mastery: Number(mastery.accuracy ?? 0),
    pyqPerformance: Number(pyq.accuracy ?? 0),
    mockTestPerformance: recentTestSignal,
    recentTrend: trend,
    retention: Number(mastery.accuracy ?? 0),
    speed: Number(mastery.speed ?? 0),
    confidenceCalibration: Number(mastery.accuracy ?? 0),
    subjectCoverage: Number(evidence.coverage.total) > 0 ? Number(evidence.subjects.touched) / Number(evidence.coverage.total) : 0,
    consistency: Math.min(1, Number(evidence.activity.active_days) / 20),
  };
  const index = computeExamReadinessIndex(signals);
  const previous = await getLatestReadinessSnapshot(learnerId);
  const explanation = explainReadinessChange(index, previous ? { overall: previous.overall_score, breakdown: previous.breakdown } : null);
  await saveReadinessSnapshot({ learnerId, overall: index.overall, breakdown: index.breakdown });
  return { ...index, signals, explanation, disclaimer: EXAM_READINESS_DISCLAIMER };
}
