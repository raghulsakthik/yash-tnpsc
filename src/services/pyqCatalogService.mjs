// Phase 26.3/26.7 — PyqCatalogService: year-wise/subject-wise/topic-wise/
// mixed/weak-area/incorrect/timed PYQ practice, all as one filtered list
// over the real PYQ catalogue (pyqCatalogRepository.mjs). "Weak-area"
// reuses Phase 4/6's own live classification (getLearnerSummary, unchanged)
// rather than recomputing weakness here. Answering a PYQ question is not a
// new flow — it goes through the exact same recordAttempt() pipeline every
// other question does (see POST /api/v1/pyq/:id/attempt's route).
import { getLearnerSummary } from './learnerStateService.mjs';
import { findPyqQuestions, findPyqQuestionById, findPyqYears, findPyqTopics } from '../repository/pyqCatalogRepository.mjs';
import { NotFoundError, ValidationError } from './errors.mjs';

const WEAK_CLASSIFICATIONS = new Set(['WEAK', 'CRITICAL', 'PREREQUISITE_BLOCKED']);

export async function listPyqQuestions(learnerId, { year, subjectId, topicId, mode, limit } = {}) {
  const filters = { year, subjectId, topicId, limit };

  if (mode === 'weak-area') {
    const summary = await getLearnerSummary(learnerId);
    const weakTopicIds = summary.classifications.filter((c) => WEAK_CLASSIFICATIONS.has(c.classification)).map((c) => c.topicId);
    if (weakTopicIds.length === 0) {
      return { mode, questions: [], timeLimitSeconds: 0, reason: 'no topic currently classifies as weak — nothing to target yet' };
    }
    filters.topicIds = weakTopicIds;
  } else if (mode === 'incorrect') {
    filters.incorrectOnlyLearnerId = learnerId;
  } else if (mode && mode !== 'mixed' && mode !== 'year-wise' && mode !== 'subject-wise' && mode !== 'topic-wise' && mode !== 'timed') {
    throw new ValidationError([`unknown mode '${mode}'`]);
  }

  const questions = await findPyqQuestions(filters);
  const timeLimitSeconds = questions.reduce((sum, q) => sum + q.estimatedSeconds, 0);
  return { mode: mode ?? 'mixed', questions, timeLimitSeconds };
}

export async function getPyqQuestion(id) {
  const question = await findPyqQuestionById(id);
  if (!question) throw new NotFoundError(`no real PYQ question ${id}`);
  return question;
}

export async function getPyqYears() {
  return findPyqYears();
}

export async function getPyqTopics() {
  return findPyqTopics();
}
