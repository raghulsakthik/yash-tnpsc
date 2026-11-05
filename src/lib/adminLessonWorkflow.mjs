import { PERMISSIONS } from './permissions.mjs';

export const LESSON_STATUSES = Object.freeze(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']);

export function isLessonStatus(value) {
  return LESSON_STATUSES.includes(value);
}

export function lessonStatusPermission(status) {
  switch (status) {
    case 'IN_REVIEW':
    case 'DRAFT':
      return PERMISSIONS.CONTENT_UPDATE;
    case 'ARCHIVED':
      return PERMISSIONS.CONTENT_DELETE;
    case 'APPROVED':
      return PERMISSIONS.REVIEW_CONTENT;
    case 'PUBLISHED':
      return PERMISSIONS.CONTENT_PUBLISH;
    default:
      return null;
  }
}

const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: ['IN_REVIEW', 'ARCHIVED'],
  IN_REVIEW: ['APPROVED', 'DRAFT', 'ARCHIVED'],
  APPROVED: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
  PUBLISHED: ['DRAFT', 'ARCHIVED'],
  ARCHIVED: ['DRAFT'],
});

export function isAllowedLessonTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  return Boolean(ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus));
}

export function lessonTransitionPermission(currentStatus, nextStatus) {
  if (nextStatus === undefined || nextStatus === null || nextStatus === currentStatus) return null;
  if (nextStatus === 'ARCHIVED') return PERMISSIONS.CONTENT_DELETE;
  if (currentStatus === 'PUBLISHED' && nextStatus === 'DRAFT') return PERMISSIONS.CONTENT_PUBLISH;
  return lessonStatusPermission(nextStatus);
}
