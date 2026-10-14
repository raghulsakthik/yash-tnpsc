import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLearner,
  validateSubject,
  validateTopic,
  validatePrerequisite,
  validateContent,
  validateLesson,
  validateQuestion,
  validateAssessment,
  validateLearningSession,
  validateLearningAttempt,
  canTransitionContentStatus,
} from '../src/domain/validation.mjs';
import { ContentType, ContentStatus, AssessmentType, SessionType } from '../src/domain/enums.mjs';

test('a learner needs a non-empty name', () => {
  assert.equal(validateLearner({ name: 'Yashika' }).length, 0);
  assert.ok(validateLearner({ name: '' }).length > 0);
  assert.ok(validateLearner({}).length > 0);
});

test('a subject needs both an id and a name', () => {
  assert.equal(validateSubject({ id: 'gs', name: 'General Studies' }).length, 0);
  assert.ok(validateSubject({ id: 'gs' }).length > 0);
  assert.ok(validateSubject({ name: 'General Studies' }).length > 0);
});

test('a topic needs an id, a chapterId and a name', () => {
  assert.equal(validateTopic({ id: 't1', chapterId: 'c1', name: 'Fractions' }).length, 0);
  assert.ok(validateTopic({ id: 't1', name: 'Fractions' }).length > 0);
});

test('a prerequisite cannot reference itself and needs strength in (0, 1]', () => {
  assert.equal(validatePrerequisite({ topicId: 'a', prerequisiteTopicId: 'b', strength: 0.8 }).length, 0);
  assert.ok(validatePrerequisite({ topicId: 'a', prerequisiteTopicId: 'a', strength: 0.8 }).length > 0);
  assert.ok(validatePrerequisite({ topicId: 'a', prerequisiteTopicId: 'b', strength: 0 }).length > 0);
  assert.ok(validatePrerequisite({ topicId: 'a', prerequisiteTopicId: 'b', strength: 1.5 }).length > 0);
});

test('content requires a known type and topicId, difficulty bounded to [0,1]', () => {
  assert.equal(validateContent({ type: ContentType.LESSON, topicId: 't1' }).length, 0);
  assert.ok(validateContent({ type: 'NOT_A_TYPE', topicId: 't1' }).length > 0);
  assert.ok(validateContent({ type: ContentType.LESSON, topicId: 't1', difficulty: 1.5 }).length > 0);
});

test('content status only ever moves forward through the lifecycle', () => {
  assert.equal(canTransitionContentStatus(ContentStatus.DRAFT, ContentStatus.VALIDATING), true);
  assert.equal(canTransitionContentStatus(ContentStatus.DRAFT, ContentStatus.PUBLISHED), true);
  assert.equal(canTransitionContentStatus(ContentStatus.PUBLISHED, ContentStatus.DRAFT), false);
  assert.equal(canTransitionContentStatus(ContentStatus.DRAFT, ContentStatus.DRAFT), true);
});

test('a lesson needs a title and a body', () => {
  assert.equal(validateLesson({ title: 'Fractions basics', body: 'A fraction is...' }).length, 0);
  assert.ok(validateLesson({ title: '' , body: 'text' }).length > 0);
  assert.ok(validateLesson({ title: 'Title' }).length > 0);
});

test('a question needs at least 4 options and an in-range answer index', () => {
  const base = { topicId: 't1', prompt: '2+2?', options: ['3', '4', '5', '6'], answerIndex: 1, difficulty: 0.2 };
  assert.equal(validateQuestion(base).length, 0);
  assert.ok(validateQuestion({ ...base, options: ['3', '4'] }).length > 0);
  assert.ok(validateQuestion({ ...base, answerIndex: 9 }).length > 0);
  assert.ok(validateQuestion({ ...base, difficulty: 2 }).length > 0);
});

test('an assessment needs a known type', () => {
  assert.equal(validateAssessment({ type: AssessmentType.DIAGNOSTIC }).length, 0);
  assert.ok(validateAssessment({ type: 'NOT_A_TYPE' }).length > 0);
});

test('a learning session needs a learnerId and a known sessionType', () => {
  assert.equal(validateLearningSession({ learnerId: 'l1', sessionType: SessionType.PRACTICE }).length, 0);
  assert.ok(validateLearningSession({ sessionType: SessionType.PRACTICE }).length > 0);
  assert.ok(validateLearningSession({ learnerId: 'l1', sessionType: 'NOT_A_TYPE' }).length > 0);
});

test('a learning attempt needs learnerId, questionId and topicId', () => {
  assert.equal(validateLearningAttempt({ learnerId: 'l1', questionId: 'q1', topicId: 't1' }).length, 0);
  assert.ok(validateLearningAttempt({ learnerId: 'l1', questionId: 'q1' }).length > 0);
});
