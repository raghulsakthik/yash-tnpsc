// Phase 29.7 — AiFeedbackLoopService. Closes the loop the brief describes
// (AI Explanation -> Learner Response -> Practice Result -> Learning Gain
// -> Evaluate AI Intervention) by reusing Phase 14's real intervention
// tracking, unchanged — an AI interaction that got linked to an
// intervention (aiTutorService.mjs, this phase) is "AI-assisted"; every
// other evaluated intervention is the real comparison baseline. No second
// gain-measurement mechanism.
import { summarizeInterventionEffectiveness } from '../domain/intervention.mjs';
import { listInterventions } from './interventionService.mjs';
import { findInterventionIdsWithAiInteraction } from '../repository/aiInteractionRepository.mjs';

export async function getAiFeedbackLoop(learnerId) {
  const [interventions, aiAssistedIds] = await Promise.all([listInterventions(learnerId), findInterventionIdsWithAiInteraction(learnerId)]);
  const assistedIdSet = new Set(aiAssistedIds);

  const assisted = interventions.filter((i) => assistedIdSet.has(i.id));
  const unassisted = interventions.filter((i) => !assistedIdSet.has(i.id));

  const assistedSummary = summarizeInterventionEffectiveness(assisted);
  const unassistedSummary = summarizeInterventionEffectiveness(unassisted);

  const bothHaveRealEvidence = assistedSummary.totalEvaluated > 0 && unassistedSummary.totalEvaluated > 0;
  return {
    aiAssisted: assistedSummary,
    unassisted: unassistedSummary,
    comparison: bothHaveRealEvidence
      ? {
          aiAssistedAverageGain: assistedSummary.averageLearningGain,
          unassistedAverageGain: unassistedSummary.averageLearningGain,
          aiAssistedPerformsBetter: assistedSummary.averageLearningGain > unassistedSummary.averageLearningGain,
        }
      : null,
    disclaimer: bothHaveRealEvidence
      ? null
      : 'not enough real, evaluated interventions on both sides yet to honestly compare AI-assisted vs unassisted learning gain',
  };
}
