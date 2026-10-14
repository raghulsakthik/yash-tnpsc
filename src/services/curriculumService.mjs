import { validateSubject, validateTopic, validatePrerequisite } from '../domain/validation.mjs';
import {
  createSubject,
  createChapter,
  createTopic,
  createPrerequisite,
  findTopicById,
} from '../repository/curriculumRepository.mjs';
import { toSubjectDto, toTopicDto, toPrerequisiteDto } from '../dto/mappers.mjs';
import { ValidationError, NotFoundError } from './errors.mjs';

export async function defineSubject({ id, name, sortOrder }) {
  const errors = validateSubject({ id, name });
  if (errors.length) throw new ValidationError(errors);
  const row = await createSubject({ id, name, sortOrder });
  return toSubjectDto(row);
}

// Chapters have no independent domain service yet (Phase 2 scopes to
// Subject/Topic/Prerequisite as entities); this helper exists only so a
// topic can be created without hand-writing chapter SQL in a caller.
export async function defineChapter({ id, subjectId, name, sortOrder, questionCount }) {
  const row = await createChapter({ id, subjectId, name, sortOrder, questionCount });
  return { id: row.id, subjectId: row.subject_id, name: row.name, sortOrder: row.sort_order, questionCount: row.question_count };
}

export async function defineTopic({ id, chapterId, name, sortOrder }) {
  const errors = validateTopic({ id, chapterId, name });
  if (errors.length) throw new ValidationError(errors);
  const row = await createTopic({ id, chapterId, name, sortOrder });
  return toTopicDto(row);
}

export async function defineTopicPrerequisite({ topicId, prerequisiteTopicId, strength }) {
  const errors = validatePrerequisite({ topicId, prerequisiteTopicId, strength });
  if (errors.length) throw new ValidationError(errors);

  const [topic, prerequisiteTopic] = await Promise.all([
    findTopicById(topicId),
    findTopicById(prerequisiteTopicId),
  ]);
  if (!topic) throw new NotFoundError(`topic not found: ${topicId}`);
  if (!prerequisiteTopic) throw new NotFoundError(`prerequisite topic not found: ${prerequisiteTopicId}`);

  const row = await createPrerequisite({ topicId, prerequisiteTopicId, strength });
  return toPrerequisiteDto(row);
}
