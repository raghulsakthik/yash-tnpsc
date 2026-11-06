import test from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, hasPermission } from '../src/lib/permissions.mjs';
import { LESSON_STATUSES, isLessonStatus, isAllowedLessonTransition, lessonStatusPermission, lessonTransitionPermission } from '../src/lib/adminLessonWorkflow.mjs';

const admin = (adminRole) => ({ role: 'ADMIN', adminRole });

test('lesson workflow statuses match the canonical lesson table', () => {
  assert.deepEqual(LESSON_STATUSES, ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']);
  for (const status of LESSON_STATUSES) assert.equal(isLessonStatus(status), true);
  assert.equal(isLessonStatus('REJECTED'), false);
});

test('lesson status transitions require separate author, reviewer and publisher permissions', () => {
  assert.equal(lessonStatusPermission('DRAFT'), PERMISSIONS.CONTENT_UPDATE);
  assert.equal(lessonStatusPermission('IN_REVIEW'), PERMISSIONS.CONTENT_UPDATE);
  assert.equal(lessonStatusPermission('APPROVED'), PERMISSIONS.REVIEW_CONTENT);
  assert.equal(lessonStatusPermission('PUBLISHED'), PERMISSIONS.CONTENT_PUBLISH);
  assert.equal(lessonStatusPermission('ARCHIVED'), PERMISSIONS.CONTENT_DELETE);
  assert.equal(lessonStatusPermission('UNKNOWN'), null);
});

test('no additional lesson transition permission is required when content keeps its current status', () => {
  assert.equal(lessonTransitionPermission('PUBLISHED', 'PUBLISHED'), null);
  assert.equal(lessonTransitionPermission('IN_REVIEW', 'IN_REVIEW'), null);
  assert.equal(lessonTransitionPermission('PUBLISHED', undefined), null);
});

test('subject expert can submit content but cannot approve or publish it', () => {
  const expert = admin('subject_expert');
  assert.equal(hasPermission(expert, PERMISSIONS.CONTENT_CREATE), true);
  assert.equal(hasPermission(expert, PERMISSIONS.CONTENT_UPDATE), true);
  assert.equal(hasPermission(expert, PERMISSIONS.REVIEW_CONTENT), false);
  assert.equal(hasPermission(expert, PERMISSIONS.CONTENT_PUBLISH), false);
});

test('content reviewer can approve but cannot publish or create new lessons', () => {
  const reviewer = admin('content_reviewer');
  assert.equal(hasPermission(reviewer, PERMISSIONS.CONTENT_READ), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.CONTENT_UPDATE), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.REVIEW_CONTENT), true);
  assert.equal(hasPermission(reviewer, PERMISSIONS.CONTENT_CREATE), false);
  assert.equal(hasPermission(reviewer, PERMISSIONS.CONTENT_PUBLISH), false);
});

test('content admin can create, review and publish lessons', () => {
  const adminUser = admin('content_admin');
  assert.equal(hasPermission(adminUser, PERMISSIONS.CONTENT_CREATE), true);
  assert.equal(hasPermission(adminUser, PERMISSIONS.CONTENT_UPDATE), true);
  assert.equal(hasPermission(adminUser, PERMISSIONS.REVIEW_CONTENT), true);
  assert.equal(hasPermission(adminUser, PERMISSIONS.CONTENT_PUBLISH), true);
});

test('lesson state machine prevents skipping human approval before publication', () => {
  assert.equal(isAllowedLessonTransition('DRAFT', 'IN_REVIEW'), true);
  assert.equal(isAllowedLessonTransition('DRAFT', 'APPROVED'), false);
  assert.equal(isAllowedLessonTransition('IN_REVIEW', 'APPROVED'), true);
  assert.equal(isAllowedLessonTransition('IN_REVIEW', 'PUBLISHED'), false);
  assert.equal(isAllowedLessonTransition('APPROVED', 'PUBLISHED'), true);
  assert.equal(isAllowedLessonTransition('PUBLISHED', 'DRAFT'), true);
  assert.equal(isAllowedLessonTransition('ARCHIVED', 'DRAFT'), true);
  assert.equal(isAllowedLessonTransition('PUBLISHED', 'ARCHIVED'), true);
});

test('withdrawal and archive require stronger permissions than ordinary editing', () => {
  assert.equal(lessonTransitionPermission('PUBLISHED', 'DRAFT'), PERMISSIONS.CONTENT_PUBLISH);
  assert.equal(lessonTransitionPermission('IN_REVIEW', 'ARCHIVED'), PERMISSIONS.CONTENT_DELETE);
});
