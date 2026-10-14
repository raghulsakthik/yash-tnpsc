import { validateQuestion } from '../domain/validation.mjs';
import { createQuestion, findQuestionById } from '../repository/questionRepository.mjs';
import { findTopicById } from '../repository/curriculumRepository.mjs';
import { toQuestionDto } from '../dto/mappers.mjs';
import { ValidationError, NotFoundError } from './errors.mjs';

// Reuses the existing `question` table verbatim (see questionRepository.mjs)
// — this is a service-layer creation path for new questions authored through
// backend services, alongside (not instead of) the existing YAML content
// pipeline (content/questions/**.yaml -> scripts/seed.mjs).
export async function authorQuestion({
  id,
  topicId,
  language,
  prompt,
  options,
  answerIndex,
  explanation,
  trap,
  difficulty,
  estimatedSeconds,
  source,
  sourceYear,
  contentId,
}) {
  const errors = validateQuestion({ topicId, prompt, options, answerIndex, difficulty });
  if (errors.length) throw new ValidationError(errors);

  const topic = await findTopicById(topicId);
  if (!topic) throw new NotFoundError(`topic not found: ${topicId}`);

  const row = await createQuestion({
    id,
    topicId,
    language,
    prompt,
    options,
    answerIndex,
    explanation,
    trap,
    difficulty,
    estimatedSeconds,
    source,
    sourceYear,
    contentId,
  });
  return toQuestionDto(row);
}

export async function getQuestion(id) {
  const row = await findQuestionById(id);
  return toQuestionDto(row);
}
