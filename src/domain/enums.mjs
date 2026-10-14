// Phase 2 — shared enums for the generic domain model. Pure data, no imports.
// These are additive: nothing in the existing engine (difficulty.mjs,
// mistakes.mjs, revision.mjs, ...) reads from here, and this file reads
// nothing from them.

export const ContentType = Object.freeze({
  LESSON: 'LESSON',
  QUESTION: 'QUESTION',
});

export const ContentStatus = Object.freeze({
  DRAFT: 'DRAFT',
  VALIDATING: 'VALIDATING',
  REVIEWED: 'REVIEWED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
});

// The order a content item is expected to move through its lifecycle.
// Used by validation to reject an out-of-order transition.
export const CONTENT_STATUS_ORDER = [
  ContentStatus.DRAFT,
  ContentStatus.VALIDATING,
  ContentStatus.REVIEWED,
  ContentStatus.PUBLISHED,
  ContentStatus.ARCHIVED,
];

export const AssessmentType = Object.freeze({
  DEFAULT_TEST: 'DEFAULT_TEST',
  DIAGNOSTIC: 'DIAGNOSTIC',
  MINI_ASSESSMENT: 'MINI_ASSESSMENT',
  WEEKLY_TEST: 'WEEKLY_TEST',
});

export const AssessmentStatus = Object.freeze({
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
});

export const SessionType = Object.freeze({
  LESSON: 'LESSON',
  PRACTICE: 'PRACTICE',
  REVISION: 'REVISION',
  TEST: 'TEST',
  ASSESSMENT: 'ASSESSMENT',
});

export const SessionStatus = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
});

export function isValidEnumValue(enumObject, value) {
  return Object.values(enumObject).includes(value);
}
