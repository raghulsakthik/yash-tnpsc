import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission, PERMISSIONS } from '../src/lib/permissions.mjs';

const session = (adminRole) => ({ role: 'ADMIN', adminRole });

test('content admin can generate, review both lesson and question items, and read content', () => {
  const admin = session('content_admin');
  assert.equal(hasPermission(admin, PERMISSIONS.AI_GENERATE), true);
  assert.equal(hasPermission(admin, PERMISSIONS.CONTENT_READ), true);
  assert.equal(hasPermission(admin, PERMISSIONS.REVIEW_CONTENT), true);
  assert.equal(hasPermission(admin, PERMISSIONS.REVIEW_QUESTION), true);
});

test('AI quality admin can generate and review both content types without content CRUD access', () => {
  const admin = session('ai_quality_admin');
  assert.equal(hasPermission(admin, PERMISSIONS.AI_GENERATE), true);
  assert.equal(hasPermission(admin, PERMISSIONS.REVIEW_CONTENT), true);
  assert.equal(hasPermission(admin, PERMISSIONS.REVIEW_QUESTION), true);
  assert.equal(hasPermission(admin, PERMISSIONS.CONTENT_CREATE), false);
});

test('question bank admin cannot review lesson content in a mixed generation batch', () => {
  const admin = session('question_bank_admin');
  assert.equal(hasPermission(admin, PERMISSIONS.AI_GENERATE), true);
  assert.equal(hasPermission(admin, PERMISSIONS.REVIEW_QUESTION), true);
  assert.equal(hasPermission(admin, PERMISSIONS.REVIEW_CONTENT), false);
});
