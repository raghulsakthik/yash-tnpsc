import test from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, hasPermission, isSubjectScoped } from '../src/lib/permissions.mjs';
import { QUESTION_STATUSES, canCreateQuestionWithStatus, isQuestionStatus, questionStatusPermission, questionTransitionPermission } from '../src/lib/adminQuestionWorkflow.mjs';

const admin = (adminRole) => ({ role: 'ADMIN', adminRole });

test('question workflow exposes only schema-supported statuses', () => {
  assert.deepEqual(QUESTION_STATUSES, ['DRAFT', 'IN_REVIEW', 'REVIEWED', 'PUBLISHED', 'REJECTED', 'ARCHIVED']);
  for (const status of QUESTION_STATUSES) assert.equal(isQuestionStatus(status), true);
  assert.equal(isQuestionStatus('PENDING'), false);
  assert.equal(isQuestionStatus('AUTO_PUBLISHED'), false);
});

test('new questions default to a draft or may enter review/published only with explicit workflow permission', () => {
  assert.equal(canCreateQuestionWithStatus('DRAFT'), true);
  assert.equal(canCreateQuestionWithStatus('IN_REVIEW'), true);
  assert.equal(canCreateQuestionWithStatus('PUBLISHED'), true);
  assert.equal(canCreateQuestionWithStatus('REJECTED'), false);
  assert.equal(canCreateQuestionWithStatus('ARCHIVED'), false);
});

test('review and publish transitions require distinct permissions', () => {
  assert.equal(questionStatusPermission('IN_REVIEW'), PERMISSIONS.REVIEW_QUESTION);
  assert.equal(questionStatusPermission('REVIEWED'), PERMISSIONS.REVIEW_QUESTION);
  assert.equal(questionStatusPermission('REJECTED'), PERMISSIONS.REVIEW_QUESTION);
  assert.equal(questionStatusPermission('PUBLISHED'), PERMISSIONS.QUESTION_PUBLISH);
  assert.equal(questionStatusPermission('DRAFT'), PERMISSIONS.QUESTION_UPDATE);
  assert.equal(questionStatusPermission('ARCHIVED'), PERMISSIONS.QUESTION_UPDATE);
  assert.equal(questionStatusPermission('UNKNOWN'), null);
});

test('question reviewer can review but cannot publish directly', () => {
  const reviewer = admin('question_reviewer');
  assert.equal(hasPermission(reviewer, PERMISSIONS.REVIEW_QUESTION), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.QUESTION_UPDATE), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.QUESTION_PUBLISH), false);
});

test('question bank admin can publish while subject expert cannot', () => {
  assert.equal(hasPermission(admin('question_bank_admin'), PERMISSIONS.QUESTION_PUBLISH), true);
  assert.equal(hasPermission(admin('subject_expert'), PERMISSIONS.QUESTION_PUBLISH), false);
});

test('editing a question without changing its current status does not require publish/review permission', () => {
  assert.equal(questionTransitionPermission('PUBLISHED', 'PUBLISHED'), null);
  assert.equal(questionTransitionPermission('IN_REVIEW', 'IN_REVIEW'), null);
  assert.equal(questionTransitionPermission('PUBLISHED', undefined), null);
});

test('only actual status transitions require their dedicated permission', () => {
  assert.equal(questionTransitionPermission('DRAFT', 'PUBLISHED'), PERMISSIONS.QUESTION_PUBLISH);
  assert.equal(questionTransitionPermission('DRAFT', 'IN_REVIEW'), PERMISSIONS.REVIEW_QUESTION);
  assert.equal(questionTransitionPermission('IN_REVIEW', 'REVIEWED'), PERMISSIONS.REVIEW_QUESTION);
  assert.equal(questionTransitionPermission('PUBLISHED', 'DRAFT'), PERMISSIONS.QUESTION_UPDATE);
});

test('content reviewer can review content but cannot author AI content or read the question bank', () => {
  const reviewer = admin('content_reviewer');
  assert.equal(hasPermission(reviewer, PERMISSIONS.CONTENT_READ), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.CONTENT_UPDATE), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.REVIEW_CONTENT), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.AI_GENERATE), false);
  assert.equal(hasPermission(reviewer, PERMISSIONS.QUESTION_READ), false);
});

test('AI quality admin can generate and review but has no broad CRUD/read permission', () => {
  const reviewer = admin('ai_quality_admin');
  assert.equal(hasPermission(reviewer, PERMISSIONS.AI_GENERATE), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.REVIEW_CONTENT), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.REVIEW_QUESTION), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.CONTENT_READ), false);
  assert.equal(hasPermission(reviewer, PERMISSIONS.QUESTION_READ), false);
});

test('analytics admin is limited to analytics read and auditor remains read-only', () => {
  const analytics = admin('analytics_admin');
  assert.equal(hasPermission(analytics, PERMISSIONS.ANALYTICS_READ), true);
  assert.equal(hasPermission(analytics, PERMISSIONS.QUESTION_READ), false);
  assert.equal(hasPermission(analytics, PERMISSIONS.CONTENT_READ), false);
  const auditor = admin('auditor');
  assert.equal(hasPermission(auditor, PERMISSIONS.AUDIT_READ), true);
  assert.equal(hasPermission(auditor, PERMISSIONS.ANALYTICS_READ), true);
  assert.equal(hasPermission(auditor, PERMISSIONS.CONTENT_READ), true);
  assert.equal(hasPermission(auditor, PERMISSIONS.QUESTION_READ), true);
  assert.equal(hasPermission(auditor, PERMISSIONS.QUESTION_UPDATE), false);
});

test('subject expert read and AI capabilities remain constrained to assigned syllabus subjects', () => {
  const expert = admin('subject_expert');
  assert.equal(hasPermission(expert, PERMISSIONS.CONTENT_READ), true);
  assert.equal(hasPermission(expert, PERMISSIONS.QUESTION_READ), true);
  assert.equal(hasPermission(expert, PERMISSIONS.AI_GENERATE), false);
  assert.equal(isSubjectScoped(expert, PERMISSIONS.CONTENT_READ), true);
  assert.equal(isSubjectScoped(expert, PERMISSIONS.QUESTION_READ), true);
  assert.equal(isSubjectScoped(expert, PERMISSIONS.AI_GENERATE), true);
  assert.equal(isSubjectScoped(admin('auditor'), PERMISSIONS.CONTENT_READ), false);
});
