// Phase 26.4 — PyqAssistantService. Composes a real PYQ question (Phase
// 21/26.7's catalogue, unchanged), its real prerequisites (Phase 3,
// unchanged) and a real similar question (26.7's catalogue repository)
// into the deterministic progressive-assistance views (pyqAssistant.mjs).
// Read-only throughout: nothing here writes to learner_topic_state or
// question.answer_index — the brief's own explicit constraint.
import { buildProgressiveHint, buildWhyExplanation, buildFullSolve } from '../domain/pyqAssistant.mjs';
import { findPyqQuestionById, findSimilarQuestion } from '../repository/pyqCatalogRepository.mjs';
import { findPrerequisitesForTopic } from '../repository/curriculumRepository.mjs';
import { findTopicName } from '../repository/weeklyPlanRepository.mjs';
import { NotFoundError } from './errors.mjs';

async function loadQuestionAndPrerequisites(questionId) {
  const question = await findPyqQuestionById(questionId);
  if (!question) throw new NotFoundError(`no real PYQ question ${questionId}`);

  const edges = await findPrerequisitesForTopic(question.topicId);
  const prerequisites = [];
  for (const edge of edges) {
    const name = await findTopicName(edge.prerequisite_topic_id);
    prerequisites.push({ topicId: edge.prerequisite_topic_id, topicName: name });
  }
  return { question, prerequisites };
}

export async function getHint(questionId, stage = 1) {
  const { question, prerequisites } = await loadQuestionAndPrerequisites(questionId);
  return { questionId, ...buildProgressiveHint(question, prerequisites, stage) };
}

export async function explainQuestion(questionId, selectedIndex = null) {
  const question = await findPyqQuestionById(questionId);
  if (!question) throw new NotFoundError(`no real PYQ question ${questionId}`);
  return { questionId, ...buildWhyExplanation(question, selectedIndex) };
}

export async function solveQuestion(questionId) {
  const question = await findPyqQuestionById(questionId);
  if (!question) throw new NotFoundError(`no real PYQ question ${questionId}`);
  const similar = await findSimilarQuestion(question.topicId, question.difficulty, question.id);
  return { questionId, ...buildFullSolve(question, similar) };
}
