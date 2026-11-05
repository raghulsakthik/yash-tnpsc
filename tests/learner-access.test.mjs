import test from 'node:test';
import assert from 'node:assert/strict';
import { isLearnerAccount } from '../src/lib/learnerAccess.mjs';

test('only an authenticated STUDENT account with an ID is accepted for learner APIs', () => {
  assert.equal(isLearnerAccount({ id: 'student-1', role: 'STUDENT' }), true);
  assert.equal(isLearnerAccount({ id: 'admin-1', role: 'ADMIN' }), false);
  assert.equal(isLearnerAccount({ id: 'super-1', role: 'SUPER_ADMIN' }), false);
  assert.equal(isLearnerAccount({ id: 'teacher-1', role: 'TEACHER' }), false);
  assert.equal(isLearnerAccount({ id: '', role: 'STUDENT' }), false);
  assert.equal(isLearnerAccount(null), false);
  assert.equal(isLearnerAccount(undefined), false);
});
