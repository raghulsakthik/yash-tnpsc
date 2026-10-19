// Phase 13 — MasteryGateService. Reads the already-persisted mastery
// dimensions (recordAttempt(), unchanged) and the most recent assessment's
// verdict (Phase 3/4, unchanged), then asks the pure gate what that adds
// up to. Writes nothing.
import { evaluateMasteryGate } from '../domain/masteryGate.mjs';
import { findTopicStateRow } from '../repository/learnerStateRepository.mjs';
import { findLatestAssessmentPerformanceForTopic } from '../repository/masteryGateRepository.mjs';

export async function getMasteryGate(learnerId, topicId) {
  const row = await findTopicStateRow(learnerId, topicId);

  if (!row) {
    // No evidence at all yet — the same zeroed-context convention Phases
    // 7/11 already use for an untouched topic, not an error.
    const decision = evaluateMasteryGate({ concept: 0, mastery: 0, retention: 0, attemptCount: 0, assessmentPerformance: null });
    return { topicId, ...decision, evidence: { concept: 0, mastery: 0, retention: 0, attemptCount: 0, assessmentPerformance: null } };
  }

  const assessmentPerformance = await findLatestAssessmentPerformanceForTopic(learnerId, topicId);
  const decision = evaluateMasteryGate({
    concept: row.concept,
    mastery: row.mastery,
    retention: row.retention,
    attemptCount: row.attempt_count,
    assessmentPerformance,
  });

  return {
    topicId,
    ...decision,
    evidence: {
      concept: row.concept,
      accuracy: row.accuracy,
      speed: row.speed,
      retention: row.retention,
      confidence: row.confidence,
      consistency: row.consistency,
      mastery: row.mastery,
      attemptCount: row.attempt_count,
      assessmentPerformance,
    },
  };
}
