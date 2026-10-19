// Phase 29.3 — LearnerAiContextService. Composes the brief's exact JSON
// shape from real, already-computed signals — getTopicState() (Phase 6,
// unchanged) for mastery/accuracy, findRecentAttemptsForTopic() (Phase 6,
// unchanged) for her real most recent mistake and confidence rating.
import { buildLearnerAiContext } from '../domain/learnerAiContext.mjs';
import { getTopicState } from './learnerStateService.mjs';
import { findRecentAttemptsForTopic } from '../repository/learnerStateRepository.mjs';
import { NotFoundError } from './errors.mjs';

export async function getLearnerAiContext(learnerId, topicId) {
  let topicState = { mastery: 0, accuracy: 0 };
  try {
    topicState = await getTopicState(learnerId, topicId);
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }

  const recent = await findRecentAttemptsForTopic(learnerId, topicId, 5);
  const mostRecentMistake = recent.find((a) => a.mistakeType)?.mistakeType ?? null;
  const mostRecentConfidence = recent.find((a) => a.confidence !== null && a.confidence !== undefined)?.confidence ?? null;

  return buildLearnerAiContext({
    topicId,
    mastery: topicState.mastery,
    accuracy: topicState.accuracy,
    recentMistakeType: mostRecentMistake,
    confidence: mostRecentConfidence,
  });
}
