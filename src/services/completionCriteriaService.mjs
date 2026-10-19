// Phase 25 — CompletionCriteriaService. Composes four already-built,
// unchanged pieces — getMasteryGate() (Phase 13), getTopicState() (Phase
// 6, for prerequisiteRisk), isRevisionDue() (Phase 11), and
// getEffectiveRetention() (Phase 24) — into the one verdict the brief's
// "Completion Criteria" section asks for. Writes nothing; every input is a
// read of state another phase already computes and persists.
import { evaluateCompletionVerdict } from '../domain/completionCriteria.mjs';
import { getMasteryGate } from './masteryGateService.mjs';
import { getTopicState } from './learnerStateService.mjs';
import { getEffectiveRetention } from './retentionEngineService.mjs';
import { isRevisionDue } from '../repository/adaptiveDecisionRepository.mjs';
import { NotFoundError } from './errors.mjs';

export async function getCompletionVerdict(learnerId, topicId) {
  // getMasteryGate() already degrades a never-touched topic to a zeroed,
  // FOUNDATION_REQUIRED context (Phase 13's own convention) rather than
  // throwing — mirror that here instead of a 404, since "what to do about
  // a topic she hasn't started" is itself a meaningful answer (CONTINUE).
  const gate = await getMasteryGate(learnerId, topicId);

  if (gate.evidence.attemptCount === 0) {
    const decision = evaluateCompletionVerdict({
      masteryGateStatus: gate.status,
      mastery: 0,
      prerequisiteRisk: 0,
      revisionDue: false,
      storedRetention: 0,
      effectiveRetention: null,
      attemptCount: 0,
    });
    return { topicId, ...decision, masteryGate: gate, evidence: { prerequisiteRisk: 0, revisionDue: false, effectiveRetention: null } };
  }

  const [topicState, revisionDue, retention] = await Promise.all([
    getTopicState(learnerId, topicId),
    isRevisionDue(learnerId, topicId),
    getEffectiveRetention(learnerId, topicId).catch((err) => {
      if (err instanceof NotFoundError) return null;
      throw err;
    }),
  ]);

  const decision = evaluateCompletionVerdict({
    masteryGateStatus: gate.status,
    mastery: gate.evidence.mastery,
    prerequisiteRisk: topicState.prerequisiteRisk,
    revisionDue,
    storedRetention: gate.evidence.retention,
    effectiveRetention: retention?.effective ?? null,
    attemptCount: gate.evidence.attemptCount,
  });

  return {
    topicId,
    ...decision,
    masteryGate: gate,
    evidence: {
      prerequisiteRisk: topicState.prerequisiteRisk,
      weakestPrerequisite: topicState.weakestPrerequisite,
      revisionDue,
      effectiveRetention: retention?.effective ?? null,
    },
  };
}
