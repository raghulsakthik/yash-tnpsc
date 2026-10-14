// Phase 2 — pure validation for the generic domain entities. No DB, no
// framework, no side effects: every function here either returns an array of
// error strings (empty = valid) or throws nothing. This mirrors the existing
// domain module style (accuracy.mjs, difficulty.mjs, ...) deliberately.

import {
  ContentType,
  ContentStatus,
  CONTENT_STATUS_ORDER,
  AssessmentType,
  AssessmentStatus,
  SessionType,
  SessionStatus,
  isValidEnumValue,
} from './enums.mjs';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDifficulty(value) {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

export function validateLearner({ name } = {}) {
  const errors = [];
  if (!isNonEmptyString(name)) errors.push('name is required');
  return errors;
}

export function validateSubject({ id, name } = {}) {
  const errors = [];
  if (!isNonEmptyString(id)) errors.push('id is required');
  if (!isNonEmptyString(name)) errors.push('name is required');
  return errors;
}

export function validateTopic({ id, chapterId, name } = {}) {
  const errors = [];
  if (!isNonEmptyString(id)) errors.push('id is required');
  if (!isNonEmptyString(chapterId)) errors.push('chapterId is required');
  if (!isNonEmptyString(name)) errors.push('name is required');
  return errors;
}

export function validatePrerequisite({ topicId, prerequisiteTopicId, strength } = {}) {
  const errors = [];
  if (!isNonEmptyString(topicId)) errors.push('topicId is required');
  if (!isNonEmptyString(prerequisiteTopicId)) errors.push('prerequisiteTopicId is required');
  if (topicId && prerequisiteTopicId && topicId === prerequisiteTopicId) {
    errors.push('a topic cannot be its own prerequisite');
  }
  if (typeof strength !== 'number' || strength <= 0 || strength > 1) {
    errors.push('strength must be a number in (0, 1]');
  }
  return errors;
}

export function validateContent({ type, topicId, difficulty, status } = {}) {
  const errors = [];
  if (!isValidEnumValue(ContentType, type)) errors.push(`type must be one of ${Object.values(ContentType).join(', ')}`);
  if (!isNonEmptyString(topicId)) errors.push('topicId is required');
  if (difficulty !== undefined && difficulty !== null && !isValidDifficulty(difficulty)) {
    errors.push('difficulty must be a number in [0, 1]');
  }
  if (status !== undefined && !isValidEnumValue(ContentStatus, status)) {
    errors.push(`status must be one of ${Object.values(ContentStatus).join(', ')}`);
  }
  return errors;
}

// A content item may only move forward along CONTENT_STATUS_ORDER (or stay
// put), never skip backward into an earlier lifecycle stage.
export function canTransitionContentStatus(fromStatus, toStatus) {
  const fromIndex = CONTENT_STATUS_ORDER.indexOf(fromStatus);
  const toIndex = CONTENT_STATUS_ORDER.indexOf(toStatus);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex >= fromIndex;
}

export function validateLesson({ title, body } = {}) {
  const errors = [];
  if (!isNonEmptyString(title)) errors.push('title is required');
  if (!isNonEmptyString(body)) errors.push('body is required');
  return errors;
}

export function validateQuestion({ topicId, prompt, options, answerIndex, difficulty } = {}) {
  const errors = [];
  if (!isNonEmptyString(topicId)) errors.push('topicId is required');
  if (!isNonEmptyString(prompt)) errors.push('prompt is required');
  if (!Array.isArray(options) || options.length < 4) errors.push('options must be an array of at least 4 items');
  if (!Number.isInteger(answerIndex) || !Array.isArray(options) || answerIndex < 0 || answerIndex >= options.length) {
    errors.push('answerIndex must be a valid index into options');
  }
  if (difficulty !== undefined && difficulty !== null && !isValidDifficulty(difficulty)) {
    errors.push('difficulty must be a number in [0, 1]');
  }
  return errors;
}

export function validateAssessment({ type, status } = {}) {
  const errors = [];
  if (!isValidEnumValue(AssessmentType, type)) errors.push(`type must be one of ${Object.values(AssessmentType).join(', ')}`);
  if (status !== undefined && !isValidEnumValue(AssessmentStatus, status)) {
    errors.push(`status must be one of ${Object.values(AssessmentStatus).join(', ')}`);
  }
  return errors;
}

export function validateLearningSession({ learnerId, sessionType, status } = {}) {
  const errors = [];
  if (!isNonEmptyString(learnerId)) errors.push('learnerId is required');
  if (!isValidEnumValue(SessionType, sessionType)) errors.push(`sessionType must be one of ${Object.values(SessionType).join(', ')}`);
  if (status !== undefined && !isValidEnumValue(SessionStatus, status)) {
    errors.push(`status must be one of ${Object.values(SessionStatus).join(', ')}`);
  }
  return errors;
}

export function validateLearningAttempt({ learnerId, questionId, topicId } = {}) {
  const errors = [];
  if (!isNonEmptyString(learnerId)) errors.push('learnerId is required');
  if (!isNonEmptyString(questionId)) errors.push('questionId is required');
  if (!isNonEmptyString(topicId)) errors.push('topicId is required');
  return errors;
}
