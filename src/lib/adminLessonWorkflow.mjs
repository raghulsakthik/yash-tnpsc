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

export function lessonTransitionPermission(currentStatus, nextStatus) {
  if (nextStatus === undefined || nextStatus === null || nextStatus === currentStatus) return null;
  return lessonStatusPermission(nextStatus);
}
