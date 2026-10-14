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

// Phase 4 — the Foundation Test Diagnostic Engine's per-topic verdict. A
// strict superset of the WEAK/STRONG split Phase 3 already computes: CRITICAL
// and PREREQUISITE_BLOCKED both explain *why* a topic is weak by walking the
// prerequisite graph, rather than just reporting that it is.
export const TopicClassification = Object.freeze({
  STRONG: 'STRONG',
  WEAK: 'WEAK',
  CRITICAL: 'CRITICAL',
  PREREQUISITE_BLOCKED: 'PREREQUISITE_BLOCKED',
  UNKNOWN: 'UNKNOWN',
});

export const RecommendationAction = Object.freeze({
  ADVANCE: 'ADVANCE',
  REINFORCE_TOPIC: 'REINFORCE_TOPIC',
  REINFORCE_PREREQUISITE: 'REINFORCE_PREREQUISITE',
  GATHER_EVIDENCE: 'GATHER_EVIDENCE',
});

// Phase 11 — the Adaptive Decision Engine's candidate action vocabulary.
// Richer than RecommendationAction above (which only ever names one of four
// broad moves): these are the actual things a learning session can be.
export const AdaptiveAction = Object.freeze({
  REPEAT_LESSON: 'REPEAT_LESSON',
  PREREQUISITE_LESSON: 'PREREQUISITE_LESSON',
  PRACTICE: 'PRACTICE',
  TIMED_PRACTICE: 'TIMED_PRACTICE',
  REVISION: 'REVISION',
  MEMORY_ECHO: 'MEMORY_ECHO',
  ADVANCE_TOPIC: 'ADVANCE_TOPIC',
  MINI_ASSESSMENT: 'MINI_ASSESSMENT',
});
