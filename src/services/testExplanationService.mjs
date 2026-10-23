// Phase 28.4 — TestExplanationService. Reads the real blueprint and
// per-question selection breakdown Phase 27 already stored in
// assessment.metadata the moment the test was created — formats them,
// recomputes nothing.
import { explainBlueprint, explainQuestionSelection } from '../domain/testExplanation.mjs';
import { findAssessmentById } from '../repository/assessmentRepository.mjs';
import { findAssessmentQuestions } from '../repository/defaultAssessmentRepository.mjs';
import { NotFoundError, ValidationError } from './errors.mjs';

export async function explainTest(testId) {
  const assessment = await findAssessmentById(testId);
  if (!assessment || assessment.type !== 'ADAPTIVE_TEST') throw new NotFoundError(`no adaptive test ${testId}`);
  if (!assessment.metadata?.blueprint) throw new ValidationError([`test ${testId} has no stored blueprint to explain`]);

  const blueprint = explainBlueprint(assessment.metadata.blueprint);
  const breakdownByQuestion = new Map((assessment.metadata.selectionBreakdown ?? []).map((b) => [b.questionId, b]));

  const questions = await findAssessmentQuestions(testId);
  const questionExplanations = questions.map((q) => {
    const stored = breakdownByQuestion.get(q.question_id);
    const explanation = stored ? explainQuestionSelection(q.topic_name, stored.breakdown) : { reasons: [], summary: `${q.topic_name}: no stored selection breakdown for this question.` };
    return { questionId: q.question_id, topicId: q.topic_id, topicName: q.topic_name, category: stored?.category ?? null, score: stored?.score ?? null, ...explanation };
  });

  return { testId, blueprint, questions: questionExplanations };
}
