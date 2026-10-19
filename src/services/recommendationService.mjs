// Phase 27.5/27.6 — RecommendationService. Builds candidates for the
// Next Best Action from real, already-built signals — Phase 11's own
// decideNextActionForTopic() does the full topic-level scoring for
// LESSON/PRACTICE/PREREQUISITE_REVIEW/REVISION/MEMORY_ECHO/TIMED_PRACTICE
// (reused as a black box, mapped onto NextBestActionType's naming);
// this only adds the genuinely new candidates the brief names that Phase
// 11 never needed to know about (PYQ/WEAK_AREA_PYQ/GAME/AI_EXPLANATION/
// MOCK_TEST/WEEKLY_TEST/INSPIRED_MCQ) and a real historicalInterventionEffectiveness
// factor from Phase 14/this phase's own summarizeInterventionEffectiveness().
import { selectNextBestAction } from '../domain/recommendationEngine.mjs';
import { summarizeInterventionEffectiveness } from '../domain/intervention.mjs';
import { NextBestActionType, AdaptiveAction } from '../domain/enums.mjs';
import { getLearnerSummary } from './learnerStateService.mjs';
import { decideNextActionForTopic } from './adaptiveDecisionService.mjs';
import { getInitialLearningAction } from './learningPlanService.mjs';
import { startIntervention, listInterventions } from './interventionService.mjs';
import { getPyqTopics } from './pyqCatalogService.mjs';
import { findActiveGameDefinitionForTopic } from '../repository/weeklyAssignmentRepository.mjs';
import { insertRecommendation, findRecommendationById, findRecommendationsForLearner, acceptRecommendationRow } from '../repository/recommendationRepository.mjs';
import { findTopicName } from '../repository/weeklyPlanRepository.mjs';
import { NotFoundError, ValidationError } from './errors.mjs';

const WEAK_CLASSIFICATIONS = new Set(['WEAK', 'CRITICAL', 'PREREQUISITE_BLOCKED']);

// AdaptiveAction (Phase 11) -> NextBestActionType (Phase 27): same
// decision, the brief's broader vocabulary.
const ADAPTIVE_TO_RECOMMENDATION = {
  [AdaptiveAction.REPEAT_LESSON]: NextBestActionType.LESSON,
  [AdaptiveAction.PREREQUISITE_LESSON]: NextBestActionType.PREREQUISITE_REVIEW,
  [AdaptiveAction.PRACTICE]: NextBestActionType.PRACTICE,
  [AdaptiveAction.TIMED_PRACTICE]: NextBestActionType.TIMED_PRACTICE,
  [AdaptiveAction.MEMORY_ECHO]: NextBestActionType.MEMORY_ECHO,
  [AdaptiveAction.ADVANCE_TOPIC]: NextBestActionType.PRACTICE,
  [AdaptiveAction.MINI_ASSESSMENT]: NextBestActionType.MOCK_TEST,
};

const DURATION_BY_ACTION = {
  [NextBestActionType.LESSON]: 15,
  [NextBestActionType.PRACTICE]: 10,
  [NextBestActionType.PREREQUISITE_REVIEW]: 15,
  [NextBestActionType.REVISION]: 10,
  [NextBestActionType.MEMORY_ECHO]: 10,
  [NextBestActionType.TIMED_PRACTICE]: 10,
  [NextBestActionType.PYQ]: 15,
  [NextBestActionType.WEAK_AREA_PYQ]: 15,
  [NextBestActionType.GAME]: 10,
  [NextBestActionType.AI_EXPLANATION]: 5,
  [NextBestActionType.MOCK_TEST]: 30,
  [NextBestActionType.WEEKLY_TEST]: 30,
};

function difficultyLabel(mastery) {
  if (mastery >= 0.7) return 'HARD';
  if (mastery >= 0.4) return 'MEDIUM';
  return 'EASY';
}

async function historicalEffectivenessFor(learnerId, action) {
  const interventions = await listInterventions(learnerId);
  const summary = summarizeInterventionEffectiveness(interventions);
  const byType = summary.byType[action];
  // No real history for this action yet — a neutral, explicitly-untested
  // default (same "initial value, not yet tuned" honesty as every scoring
  // module since Phase 11), not an invented track record.
  if (!byType || byType.count === 0) return 0.5;
  return byType.IMPROVED / byType.count;
}

export async function getRecommendations(learnerId, { limit = 5 } = {}) {
  const summary = await getLearnerSummary(learnerId);
  const weakest = summary.classifications.filter((c) => WEAK_CLASSIFICATIONS.has(c.classification))[0];
  const initialAction = await getInitialLearningAction(learnerId);

  const primaryTopicId = weakest?.topicId ?? (initialAction.topicId ?? null);
  const candidates = [];

  if (primaryTopicId) {
    const decision = await decideNextActionForTopic(learnerId, primaryTopicId);
    const topicName = await findTopicName(primaryTopicId);
    const mappedAction = ADAPTIVE_TO_RECOMMENDATION[decision.action] ?? NextBestActionType.PRACTICE;

    candidates.push({
      action: mappedAction,
      target: primaryTopicId,
      durationMinutes: DURATION_BY_ACTION[mappedAction] ?? 10,
      difficulty: difficultyLabel(decision.context.mastery),
      reason: decision.reason,
      factors: {
        learningNeed: 1 - decision.context.accuracy,
        examImportance: 0.5,
        prerequisiteImportance: decision.context.prerequisiteRisk,
        retentionUrgency: decision.context.revisionDue ? 1 : 1 - decision.context.retention,
        expectedLearningGain: decision.score,
        completionProbability: Math.max(0, 1 - (DURATION_BY_ACTION[mappedAction] ?? 10) / 60),
        learnerPreference: 0.5, // no real preference-tracking signal exists yet in this system
        historicalInterventionEffectiveness: await historicalEffectivenessFor(learnerId, mappedAction),
      },
    });

    const pyqTopics = await getPyqTopics();
    const hasPyqForTopic = pyqTopics.some((t) => t.topicId === primaryTopicId);
    if (hasPyqForTopic) {
      const isWeak = Boolean(weakest);
      const action = isWeak ? NextBestActionType.WEAK_AREA_PYQ : NextBestActionType.PYQ;
      candidates.push({
        action,
        target: primaryTopicId,
        durationMinutes: DURATION_BY_ACTION[action],
        difficulty: difficultyLabel(decision.context.mastery),
        reason: `${topicName} has real past-paper questions available${isWeak ? ' and is currently a weak area' : ''}`,
        factors: {
          learningNeed: 1 - decision.context.accuracy,
          examImportance: 1,
          prerequisiteImportance: decision.context.prerequisiteRisk * 0.5,
          retentionUrgency: decision.context.revisionDue ? 1 : 0.3,
          expectedLearningGain: isWeak ? 0.8 : 0.5,
          completionProbability: 0.8,
          learnerPreference: 0.5,
          historicalInterventionEffectiveness: await historicalEffectivenessFor(learnerId, action),
        },
      });
    }

    const game = await findActiveGameDefinitionForTopic(primaryTopicId);
    if (game) {
      candidates.push({
        action: NextBestActionType.GAME,
        target: primaryTopicId,
        durationMinutes: DURATION_BY_ACTION[NextBestActionType.GAME],
        difficulty: difficultyLabel(decision.context.mastery),
        reason: `a real, active game ("${game.name}") covers ${topicName}`,
        factors: {
          learningNeed: (1 - decision.context.accuracy) * 0.6,
          examImportance: 0.4,
          prerequisiteImportance: 0,
          retentionUrgency: 0.2,
          expectedLearningGain: 0.5,
          completionProbability: 0.9, // games are short and self-contained — real historical pattern from Phase 22
          learnerPreference: 0.6, // games are generally more engaging — a stated assumption, not measured
          historicalInterventionEffectiveness: await historicalEffectivenessFor(learnerId, NextBestActionType.GAME),
        },
      });
    }
  }

  // Always-available fallback candidates — low priority unless nothing
  // specific outranks them, exactly like Phase 11's own PRACTICE baseline.
  candidates.push({
    action: NextBestActionType.WEEKLY_TEST,
    target: null,
    durationMinutes: DURATION_BY_ACTION[NextBestActionType.WEEKLY_TEST],
    difficulty: 'MEDIUM',
    reason: 'the real weekly aptitude+reasoning test is always available',
    factors: {
      learningNeed: 0.2,
      examImportance: 0.6,
      prerequisiteImportance: 0,
      retentionUrgency: 0.1,
      expectedLearningGain: 0.3,
      completionProbability: 0.6,
      learnerPreference: 0.5,
      historicalInterventionEffectiveness: await historicalEffectivenessFor(learnerId, NextBestActionType.WEEKLY_TEST),
    },
  });

  const nextBest = selectNextBestAction(candidates);

  const toPersist = nextBest.candidates.slice(0, limit);
  const rows = [];
  for (const c of toPersist) {
    const row = await insertRecommendation({
      learnerId,
      action: c.action,
      targetTopicId: c.target,
      durationMinutes: c.durationMinutes,
      difficulty: c.difficulty,
      reason: c.reason,
      confidence: c.confidence,
      scoreBreakdown: c.factors,
    });
    rows.push({
      recommendationId: row.id,
      action: row.action,
      target: row.target_topic_id,
      durationMinutes: row.duration_minutes,
      difficulty: row.difficulty,
      reason: row.reason,
      confidence: row.confidence,
      status: row.status,
    });
  }
  return { recommendations: rows, nextBestAction: rows[0] ?? null };
}

export async function getNextAction(learnerId) {
  const { nextBestAction } = await getRecommendations(learnerId, { limit: 1 });
  return nextBestAction;
}

export async function listRecommendations(learnerId) {
  const rows = await findRecommendationsForLearner(learnerId);
  return rows.map((r) => ({
    recommendationId: r.id,
    action: r.action,
    target: r.target_topic_id,
    durationMinutes: r.duration_minutes,
    difficulty: r.difficulty,
    reason: r.reason,
    confidence: r.confidence,
    status: r.status,
    createdAt: r.created_at,
    acceptedAt: r.accepted_at,
  }));
}

export async function acceptRecommendation(id, learnerId) {
  const recommendation = await findRecommendationById(id);
  if (!recommendation) throw new NotFoundError(`no recommendation ${id}`);
  if (recommendation.status !== 'PENDING') throw new ValidationError([`recommendation ${id} is already ${recommendation.status.toLowerCase()}`]);

  // Accepting a topic-targeted recommendation starts a real Phase 14
  // intervention, so its effectiveness is measurable later — reused,
  // never a second tracking mechanism.
  let interventionId = null;
  if (recommendation.target_topic_id) {
    const intervention = await startIntervention(learnerId, recommendation.target_topic_id);
    interventionId = intervention.id;
  }

  const updated = await acceptRecommendationRow(id, interventionId);
  return {
    recommendationId: updated.id,
    status: updated.status,
    acceptedAt: updated.accepted_at,
    interventionId: updated.intervention_id,
  };
}
