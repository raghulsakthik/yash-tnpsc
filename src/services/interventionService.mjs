// Phase 14 — InterventionService: every adaptive recommendation treated as
// an experiment. Reuses decideNextActionForTopic() (Phase 11) to decide
// what the intervention *is* and its baseline mastery/retention, and
// getTopicState() (Phase 6) to read the post snapshot — nothing here
// recomputes either.
import {
  computeInterventionGains,
  assessInterventionEffectiveness,
  summarizeInterventionEffectiveness,
  summarizeInterventionEffectivenessByTopic,
} from '../domain/intervention.mjs';
import { decideNextActionForTopic } from './adaptiveDecisionService.mjs';
import { getTopicState } from './learnerStateService.mjs';
import { getLearnerAiContext } from './learnerAiContextService.mjs';
import {
  createIntervention,
  findInterventionById,
  findInterventionsForLearner,
  markInterventionEvaluated,
  sumAttemptTimeSince,
} from '../repository/interventionRepository.mjs';
import { toInterventionDto } from '../dto/mappers.mjs';
import { ValidationError, NotFoundError } from './errors.mjs';

/**
 * Starts tracking an intervention: snapshots her current mastery/retention
 * on this topic as the baseline, and tags it with whatever the Adaptive
 * Decision Engine currently recommends — so later, "did reinforcing
 * fractions work" is answered against what was actually recommended, not
 * guessed after the fact.
 */
export async function startIntervention(learnerId, topicId) {
  const decision = await decideNextActionForTopic(learnerId, topicId);
  // Phase 30.2 — "store... learnerState": the real Phase 29.3 personalized
  // AI context, captured once, at the exact moment the baseline is taken.
  const learnerStateSnapshot = await getLearnerAiContext(learnerId, topicId);
  const row = await createIntervention({
    learnerId,
    topicId,
    interventionType: decision.action,
    baselineScore: decision.context.mastery,
    baselineRetention: decision.context.retention,
    learnerStateSnapshot,
  });
  return { ...toInterventionDto(row), decision };
}

export async function getIntervention(id) {
  const row = await findInterventionById(id);
  if (!row) throw new NotFoundError(`no intervention ${id}`);
  return toInterventionDto(row);
}

export async function listInterventions(learnerId) {
  const rows = await findInterventionsForLearner(learnerId);
  return rows.map(toInterventionDto);
}

/**
 * Takes the post snapshot and answers the question this whole phase exists
 * for: did it work? Time spent is summed from the same question_attempt
 * rows recordAttempt() already writes — no new tracking mechanism, no
 * reliance on the learner having stayed inside one session.
 */
export async function evaluateIntervention(interventionId) {
  const intervention = await findInterventionById(interventionId);
  if (!intervention) throw new NotFoundError(`no intervention ${interventionId}`);
  if (intervention.status !== 'ACTIVE') {
    throw new ValidationError([`intervention ${interventionId} is already ${intervention.status.toLowerCase()}`]);
  }

  let postScore = 0;
  let postRetention = 0;
  try {
    const topicState = await getTopicState(intervention.learner_id, intervention.topic_id);
    postScore = topicState.mastery;
    postRetention = topicState.retention;
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
    // No state at all now would be bizarre (there was a baseline), but
    // handled the same zeroed-context way every other phase does.
  }

  const gains = computeInterventionGains({
    baselineScore: intervention.baseline_score,
    postScore,
    baselineRetention: intervention.baseline_retention,
    postRetention,
  });
  const timeSpentMs = await sumAttemptTimeSince(intervention.learner_id, intervention.topic_id, intervention.started_at);

  const updated = await markInterventionEvaluated({
    id: interventionId,
    postScore,
    postRetention,
    learningGain: gains.learningGain,
    retentionGain: gains.retentionGain,
    timeSpentMs,
  });

  const effectiveness = assessInterventionEffectiveness(gains);
  return { ...toInterventionDto(updated), effectiveness };
}

/**
 * Phase 27.6 — "the system learns that this intervention was effective",
 * aggregated: real counts of IMPROVED/NO_CHANGE/REGRESSED across every
 * evaluated intervention this learner has had, overall and by action type.
 */
export async function getInterventionEffectiveness(learnerId) {
  const interventions = await listInterventions(learnerId);
  return summarizeInterventionEffectiveness(interventions);
}

/**
 * Phase 30.2 — the same real, evaluated history, broken down per topic:
 * "for this concept, which real intervention type has actually worked
 * best so far."
 */
export async function getInterventionEffectivenessByTopic(learnerId) {
  const interventions = await listInterventions(learnerId);
  return summarizeInterventionEffectivenessByTopic(interventions);
}
