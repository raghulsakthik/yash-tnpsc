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

// Phase 13 — the Mastery Gate's readiness ladder. Richer than
// TopicClassification (which only ever reads current accuracy): this also
// weighs whether independent assessment evidence has actually confirmed
// what practice alone suggests, and whether it has held up over time.
export const MasteryGateStatus = Object.freeze({
  FOUNDATION_REQUIRED: 'FOUNDATION_REQUIRED',
  DEVELOPING: 'DEVELOPING',
  PRACTICING: 'PRACTICING',
  NEAR_MASTERY: 'NEAR_MASTERY',
  MASTERED: 'MASTERED',
  RETAINED: 'RETAINED',
});

// Phase 11 — the Adaptive Decision Engine's candidate action vocabulary.
// Richer than RecommendationAction above (which only ever names one of four
// broad moves): these are the actual things a learning session can be.
// Phase 17 — the Streak + Milestone Engine's achievement vocabulary.
// '100_QUESTIONS' and '7_DAY_STREAK' are kept as the literal brief-specified
// values even though they can't be JS identifiers as written — the object
// key is a valid name, the string value is what's actually stored/compared.
export const MilestoneType = Object.freeze({
  FIRST_LESSON: 'FIRST_LESSON',
  FIRST_TEST: 'FIRST_TEST',
  FIRST_MASTERED_TOPIC: 'FIRST_MASTERED_TOPIC',
  HUNDRED_QUESTIONS: '100_QUESTIONS',
  SEVEN_DAY_STREAK: '7_DAY_STREAK',
  TOPIC_RECOVERY: 'TOPIC_RECOVERY',
  FIRST_PYQ: 'FIRST_PYQ',
});

// Phase 14 — Intervention Tracking. Every adaptive recommendation treated
// as an experiment: ACTIVE from the moment it's made, EVALUATED once a
// post-snapshot is taken, ABANDONED if the learner moved on before that.
export const InterventionStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  EVALUATED: 'EVALUATED',
  ABANDONED: 'ABANDONED',
});

export const InterventionVerdict = Object.freeze({
  IMPROVED: 'IMPROVED',
  NO_CHANGE: 'NO_CHANGE',
  REGRESSED: 'REGRESSED',
});

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

// Phase 27.5 — the Recommendation Engine's candidate action set. Named
// NextBestActionType, not RecommendationAction, to avoid colliding with the
// existing, unrelated Phase 4 RecommendationAction above (diagnostic.mjs's
// own narrow ADVANCE/REINFORCE_TOPIC/REINFORCE_PREREQUISITE/GATHER_EVIDENCE
// vocabulary — unchanged, still exactly what it was). Broader than
// AdaptiveAction (which this reuses as its base): AdaptiveAction is "what's
// the next step on THIS topic"; this is "what's the single next best thing
// to do at all" — new entries (PYQ/WEAK_AREA_PYQ/INSPIRED_MCQ/GAME/
// AI_EXPLANATION/MOCK_TEST/WEEKLY_TEST) are real capabilities Phases
// 21/22/25/26 already built that AdaptiveAction never needed to know about.
export const NextBestActionType = Object.freeze({
  LESSON: 'LESSON',
  PRACTICE: 'PRACTICE',
  PREREQUISITE_REVIEW: 'PREREQUISITE_REVIEW',
  REVISION: 'REVISION',
  MEMORY_ECHO: 'MEMORY_ECHO',
  TIMED_PRACTICE: 'TIMED_PRACTICE',
  PYQ: 'PYQ',
  WEAK_AREA_PYQ: 'WEAK_AREA_PYQ',
  INSPIRED_MCQ: 'INSPIRED_MCQ',
  GAME: 'GAME',
  AI_EXPLANATION: 'AI_EXPLANATION',
  MOCK_TEST: 'MOCK_TEST',
  WEEKLY_TEST: 'WEEKLY_TEST',
});

// Phase 25 — the Completion Criteria verdict: not "what to do right now"
// (AdaptiveAction already owns that, at the question/lesson level) but "what
// is this topic's standing right now, at the subject-progression level" —
// the literal vocabulary the brief asks for.
export const CompletionVerdict = Object.freeze({
  CONTINUE: 'CONTINUE',
  STRENGTHEN: 'STRENGTHEN',
  REVISE: 'REVISE',
  REASSESS: 'REASSESS',
  MASTERED: 'MASTERED',
  RETAINED: 'RETAINED',
});

// Phase 29.4 — AI Tutor Intelligence's ten capabilities. Every value here
// is a real ai_interaction.type the CHECK constraint (V16) accepts.
export const AITaskType = Object.freeze({
  EXPLAIN_SIMPLY: 'EXPLAIN_SIMPLY',
  GIVE_HINT: 'GIVE_HINT',
  SHOW_EXAMPLE: 'SHOW_EXAMPLE',
  TEACH_PREREQUISITE: 'TEACH_PREREQUISITE',
  SOLVE_STEP_BY_STEP: 'SOLVE_STEP_BY_STEP',
  EXPLAIN_MISTAKE: 'EXPLAIN_MISTAKE',
  SIMILAR_QUESTION: 'SIMILAR_QUESTION',
  COMPARE_CONCEPTS: 'COMPARE_CONCEPTS',
  SUMMARIZE_TOPIC: 'SUMMARIZE_TOPIC',
  REVISION_NOTES: 'REVISION_NOTES',
  // Phase 30 — AI Adaptation. INTERPRET_PATTERNS and EXPLAIN_RECOMMENDATION
  // are topic-scoped, dispatched through the same aiTutorService.mjs
  // pipeline as the Phase 29 tasks above. ANALYZE_TEST/
  // EXPLAIN_TEST_CONSTRUCTION/EXPLAIN_READINESS are scoped to a whole
  // test or the whole learner — ai_interaction has no real FK slot for
  // either, so those three are handled by aiInsightsService.mjs instead
  // (same prompt template / provider / validator machinery, no
  // topic-keyed cache).
  INTERPRET_PATTERNS: 'INTERPRET_PATTERNS',
  EXPLAIN_RECOMMENDATION: 'EXPLAIN_RECOMMENDATION',
  ANALYZE_TEST: 'ANALYZE_TEST',
  EXPLAIN_TEST_CONSTRUCTION: 'EXPLAIN_TEST_CONSTRUCTION',
  EXPLAIN_READINESS: 'EXPLAIN_READINESS',
});

// Question-level tasks need a real questionId; topic-level ones operate
// over a topic (and, for COMPARE_CONCEPTS, a second topic) alone.
export const AI_TASK_SCOPE = Object.freeze({
  [AITaskType.EXPLAIN_SIMPLY]: 'QUESTION',
  [AITaskType.GIVE_HINT]: 'QUESTION',
  [AITaskType.SHOW_EXAMPLE]: 'TOPIC',
  [AITaskType.TEACH_PREREQUISITE]: 'TOPIC',
  [AITaskType.SOLVE_STEP_BY_STEP]: 'QUESTION',
  [AITaskType.EXPLAIN_MISTAKE]: 'QUESTION',
  [AITaskType.SIMILAR_QUESTION]: 'QUESTION',
  [AITaskType.COMPARE_CONCEPTS]: 'TOPIC_PAIR',
  [AITaskType.SUMMARIZE_TOPIC]: 'TOPIC',
  [AITaskType.REVISION_NOTES]: 'TOPIC',
  [AITaskType.INTERPRET_PATTERNS]: 'TOPIC',
  [AITaskType.EXPLAIN_RECOMMENDATION]: 'TOPIC',
});
