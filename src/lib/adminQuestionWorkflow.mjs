import { PERMISSIONS } from './permissions.mjs';

export const QUESTION_STATUSES = Object.freeze([
  'DRAFT',
  'IN_REVIEW',
  'REVIEWED',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
]);

export function questionStatusPermission(status) {
  switch (status) {
    case 'IN_REVIEW':
    case 'REVIEWED':
    case 'REJECTED':
      return PERMISSIONS.REVIEW_QUESTION;
    case 'PUBLISHED':
      return PERMISSIONS.QUESTION_PUBLISH;
    case 'DRAFT':
    case 'ARCHIVED':
      return PERMISSIONS.QUESTION_UPDATE;
    default:
      return null;
  }
}

export function isQuestionStatus(value) {
  return QUESTION_STATUSES.includes(value);
}

export function canCreateQuestionWithStatus(status) {
  return status === 'DRAFT' || status === 'IN_REVIEW' || status === 'PUBLISHED';
}

export function questionTransitionPermission(currentStatus, nextStatus) {
  if (nextStatus === undefined || nextStatus === null || nextStatus === currentStatus) return null;
  return questionStatusPermission(nextStatus);
}
