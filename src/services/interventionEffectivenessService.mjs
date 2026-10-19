// Phase 15 — InterventionEffectivenessService: ties the real test-to-test
// comparison (testComparisonService.mjs, this phase) to the real tracked
// intervention for that topic (interventionRepository.mjs, Phase 14,
// unchanged) — the fuller picture neither alone gives: not just "did
// mastery move between two snapshots" (Phase 14) but "did two actual
// assessments confirm it, and what was the intervention that was supposed
// to cause it."
import { compareTopicAcrossLatestTests } from './testComparisonService.mjs';
import { findInterventionsForLearner } from '../repository/interventionRepository.mjs';
import { toInterventionDto } from '../dto/mappers.mjs';

export async function evaluateInterventionAcrossTests(learnerId, topicId) {
  const comparison = await compareTopicAcrossLatestTests(learnerId, topicId);

  const interventions = await findInterventionsForLearner(learnerId);
  const latest = interventions
    .filter((i) => i.topic_id === topicId)
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];

  return {
    topicId,
    comparison,
    intervention: latest ? toInterventionDto(latest) : null,
  };
}
