// Phase 2 — row (snake_case, as Postgres returns it) -> DTO (camelCase, what
// services/APIs should deal in) mappers. Pure functions, no DB, no framework.
// Each one is deliberately explicit about its field list rather than a
// generic snake->camel transform, so a schema column rename doesn't silently
// change API shape.

export function toLearnerDto(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function toSubjectDto(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, sortOrder: row.sort_order };
}

export function toTopicDto(row) {
  if (!row) return null;
  return { id: row.id, chapterId: row.chapter_id, name: row.name, sortOrder: row.sort_order };
}

export function toPrerequisiteDto(row) {
  if (!row) return null;
  return { topicId: row.topic_id, prerequisiteTopicId: row.prerequisite_topic_id, strength: Number(row.strength) };
}

export function toContentDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    topicId: row.topic_id,
    difficulty: row.difficulty === null ? null : Number(row.difficulty),
    status: row.status,
    contentVersion: row.content_version,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toLessonDto(row) {
  if (!row) return null;
  return { contentId: row.content_id, title: row.title, body: row.body };
}

export function toQuestionDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    topicId: row.topic_id,
    language: row.language,
    prompt: row.prompt,
    options: row.options,
    answerIndex: row.answer_index,
    explanation: row.explanation,
    trap: row.trap,
    difficulty: Number(row.difficulty),
    estimatedSeconds: row.estimated_seconds,
    source: row.source,
    sourceYear: row.source_year,
    status: row.status,
    contentId: row.content_id,
  };
}

export function toAssessmentDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    learnerId: row.learner_id,
    type: row.type,
    status: row.status,
    questionCount: row.question_count ?? null,
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
  };
}

export function toLearningSessionDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    learnerId: row.learner_id,
    topicId: row.topic_id,
    sessionType: row.session_type,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    metadata: row.metadata,
  };
}

export function toLearningAttemptDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    learnerId: row.learner_id,
    questionId: row.question_id,
    topicId: row.topic_id,
    selectedIndex: row.selected_index,
    correct: row.correct,
    timeTakenMs: row.time_taken_ms,
    confidence: row.confidence,
    mistakeType: row.mistake_type,
    sessionId: row.session_id,
    createdAt: row.created_at,
  };
}

// Phase 14
export function toInterventionDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    learnerId: row.learner_id,
    topicId: row.topic_id,
    interventionType: row.intervention_type,
    baselineScore: row.baseline_score,
    baselineRetention: row.baseline_retention,
    startedAt: row.started_at,
    timeSpentMs: row.time_spent_ms === null ? null : Number(row.time_spent_ms),
    postScore: row.post_score,
    postRetention: row.post_retention,
    learningGain: row.learning_gain,
    retentionGain: row.retention_gain,
    status: row.status,
    evaluatedAt: row.evaluated_at,
    // Phase 30.2 — the real learner-AI-context snapshot at the moment
    // this intervention started (null for interventions from before this
    // phase, or started outside startIntervention()).
    learnerStateSnapshot: row.learner_state_snapshot ?? null,
  };
}
