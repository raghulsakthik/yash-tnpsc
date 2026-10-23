// Phase 26.2 — PyqIntelligenceService. Composes the real aggregate reads
// (pyqIntelligenceRepository.mjs) with the pure reporting shapes
// (pyqIntelligence.mjs) — no new computation here, just wiring.
import {
  buildTopicFrequencyReport,
  buildSubjectFrequencyReport,
  buildYearlyTrendReport,
  buildDifficultyDistributionReport,
  buildConceptFrequencyAnswer,
} from '../domain/pyqIntelligence.mjs';
import {
  findTopicFrequency,
  findSubjectFrequency,
  findYearlyTrends,
  findDifficultyDistribution,
  findConceptFrequency,
} from '../repository/pyqIntelligenceRepository.mjs';

export async function getTopicFrequency() {
  return buildTopicFrequencyReport(await findTopicFrequency());
}

export async function getSubjectFrequency() {
  return buildSubjectFrequencyReport(await findSubjectFrequency());
}

export async function getYearlyTrends() {
  return buildYearlyTrendReport(await findYearlyTrends());
}

export async function getDifficultyDistribution() {
  return buildDifficultyDistributionReport(await findDifficultyDistribution());
}

export async function getConceptFrequency(topicId) {
  const { byYear, count } = await findConceptFrequency(topicId);
  return buildConceptFrequencyAnswer({ topicId, count, byYear });
}

// GET /api/v1/pyq/trends bundles all of the above into one call — the
// brief lists it as a single endpoint, not four.
export async function getPyqTrends() {
  const [topics, subjects, years, difficulty] = await Promise.all([
    getTopicFrequency(),
    getSubjectFrequency(),
    getYearlyTrends(),
    getDifficultyDistribution(),
  ]);
  return { topicFrequency: topics, subjectFrequency: subjects, yearlyTrends: years, difficultyDistribution: difficulty };
}
