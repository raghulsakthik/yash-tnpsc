import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMasteryGate, MASTERY_GATE_CONFIG } from '../src/domain/masteryGate.mjs';
import { MasteryGateStatus } from '../src/domain/enums.mjs';

const solid = { concept: 0.9, mastery: 0.9, retention: 0.9, attemptCount: 20, assessmentPerformance: null };

test('too few attempts is FOUNDATION_REQUIRED regardless of how good the raw scores look', () => {
  const result = evaluateMasteryGate({ ...solid, attemptCount: 1 });
  assert.equal(result.status, MasteryGateStatus.FOUNDATION_REQUIRED);
  assert.equal(result.ready, false);
});

test('a low lifetime concept score is FOUNDATION_REQUIRED even with enough attempts', () => {
  const result = evaluateMasteryGate({ ...solid, concept: 0.1 });
  assert.equal(result.status, MasteryGateStatus.FOUNDATION_REQUIRED);
});

test('low mastery is DEVELOPING', () => {
  const result = evaluateMasteryGate({ ...solid, mastery: 0.2 });
  assert.equal(result.status, MasteryGateStatus.DEVELOPING);
  assert.equal(result.ready, false);
});

test('moderate mastery is PRACTICING', () => {
  const result = evaluateMasteryGate({ ...solid, mastery: 0.5 });
  assert.equal(result.status, MasteryGateStatus.PRACTICING);
});

test('high mastery with no assessment evidence at all is NEAR_MASTERY, not MASTERED', () => {
  const result = evaluateMasteryGate({ ...solid, mastery: 0.85, assessmentPerformance: null });
  assert.equal(result.status, MasteryGateStatus.NEAR_MASTERY);
  assert.equal(result.ready, false);
  assert.match(result.reason, /no assessment/);
});

test('high mastery contradicted by a real assessment (CRITICAL) stays NEAR_MASTERY, not MASTERED', () => {
  const result = evaluateMasteryGate({ ...solid, mastery: 0.85, assessmentPerformance: { classification: 'CRITICAL' } });
  assert.equal(result.status, MasteryGateStatus.NEAR_MASTERY);
  assert.match(result.reason, /CRITICAL/);
});

test('high mastery confirmed by a STRONG assessment, but retention not yet proven, is MASTERED', () => {
  const result = evaluateMasteryGate({
    ...solid,
    mastery: 0.85,
    retention: 0.5,
    assessmentPerformance: { classification: 'STRONG' },
  });
  assert.equal(result.status, MasteryGateStatus.MASTERED);
  assert.equal(result.ready, true);
});

test('high mastery confirmed by assessment AND retention holding up is RETAINED — the top rung', () => {
  const result = evaluateMasteryGate({
    ...solid,
    mastery: 0.9,
    retention: 0.9,
    assessmentPerformance: { classification: 'STRONG' },
  });
  assert.equal(result.status, MasteryGateStatus.RETAINED);
  assert.equal(result.ready, true);
});

test('only MASTERED and RETAINED gate as ready — every earlier rung means continue intervention', () => {
  const notReady = [
    evaluateMasteryGate({ ...solid, attemptCount: 0 }),
    evaluateMasteryGate({ ...solid, concept: 0 }),
    evaluateMasteryGate({ ...solid, mastery: 0.1 }),
    evaluateMasteryGate({ ...solid, mastery: 0.5 }),
    evaluateMasteryGate({ ...solid, mastery: 0.7 }),
    evaluateMasteryGate({ ...solid, mastery: 0.85, assessmentPerformance: null }),
  ];
  assert.ok(notReady.every((r) => r.ready === false));
});

test('the ladder thresholds are read from MASTERY_GATE_CONFIG, not hardcoded twice', () => {
  const justBelow = evaluateMasteryGate({ ...solid, mastery: MASTERY_GATE_CONFIG.nearMasteryFloor - 0.01 });
  const atFloor = evaluateMasteryGate({ ...solid, mastery: MASTERY_GATE_CONFIG.nearMasteryFloor, assessmentPerformance: { classification: 'STRONG' } });
  assert.equal(justBelow.status, MasteryGateStatus.NEAR_MASTERY);
  assert.notEqual(atFloor.status, MasteryGateStatus.NEAR_MASTERY);
});
