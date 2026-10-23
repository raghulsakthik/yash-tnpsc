import { ContentType, ContentStatus } from '../domain/enums.mjs';
import { validateContent, validateLesson, canTransitionContentStatus } from '../domain/validation.mjs';
import {
  createContent,
  updateContentStatus,
  findContentById,
  createLesson,
  findLessonByContentId,
} from '../repository/contentRepository.mjs';
import { findTopicById } from '../repository/curriculumRepository.mjs';
import { toContentDto, toLessonDto } from '../dto/mappers.mjs';
import { ValidationError, NotFoundError } from './errors.mjs';

// Every content item always starts life as DRAFT — the lifecycle in
// content.md/gap-analysis.md (DRAFT -> VALIDATING -> REVIEWED -> PUBLISHED ->
// ARCHIVED) is enforced here, not left to the caller to get right.
export async function createDraftLesson({ topicId, difficulty, title, body, metadata }) {
  const contentErrors = validateContent({ type: ContentType.LESSON, topicId, difficulty });
  const lessonErrors = validateLesson({ title, body });
  const errors = [...contentErrors, ...lessonErrors];
  if (errors.length) throw new ValidationError(errors);

  const topic = await findTopicById(topicId);
  if (!topic) throw new NotFoundError(`topic not found: ${topicId}`);

  const contentRow = await createContent({
    type: ContentType.LESSON,
    topicId,
    difficulty: difficulty ?? null,
    status: ContentStatus.DRAFT,
    metadata: metadata ?? {},
  });
  const lessonRow = await createLesson({ contentId: contentRow.id, title, body });

  return { ...toContentDto(contentRow), lesson: toLessonDto(lessonRow) };
}

export async function getLessonWithContent(contentId) {
  const [contentRow, lessonRow] = await Promise.all([findContentById(contentId), findLessonByContentId(contentId)]);
  if (!contentRow || !lessonRow) return null;
  return { ...toContentDto(contentRow), lesson: toLessonDto(lessonRow) };
}

export async function transitionContentStatus(contentId, toStatus) {
  const current = await findContentById(contentId);
  if (!current) throw new NotFoundError(`content not found: ${contentId}`);
  if (!canTransitionContentStatus(current.status, toStatus)) {
    throw new ValidationError([`cannot move content from ${current.status} to ${toStatus}`]);
  }
  const row = await updateContentStatus(contentId, toStatus);
  return toContentDto(row);
}
