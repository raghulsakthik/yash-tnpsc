import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCompletionVerdict, COMPLETION_VERDICT_CONFIG } from '../src/domain/completionCriteria.mjs';
import { MasteryGateStatus, CompletionVerdict } from '../src/domain/enums.mjs';

const base = {
  masteryGateStatus: MasteryGateStatus.DEVELOPING,
  mastery: 0.2,
  prerequisiteRisk: 0,
  revisionDue: false,
  storedRetention: 0,
  effectiveRetention: null,
  attemptCount: 5,
};

test('RETAINED passes straight through from masteryGate, regardless of everything else', () => {
  const result = evaluateCompletionVerdict({ ...base, masteryGateStatus: MasteryGateStatus.RETAINED, mastery: 0.9 });
  assert.equal(result.verdict, CompletionVerdict.RETAINED);
});

test('MASTERED passes straight through from masteryGate', () => {
  const result = evaluateCompletionVerdict({ ...base, masteryGateStatus: MasteryGateStatus.MASTERED, mastery: 0.85 });
  assert.equal(result.verdict, CompletionVerdict.MASTERED);
});

test('a shaky prerequisite outranks everything else and calls for STRENGTHEN', () => {
  const result = evaluateCompletionVerdict({
    ...base,
    prerequisiteRisk: COMPLETION_VERDICT_CONFIG.prerequisiteRiskStrengthenFloor,
  });
  assert.equal(result.verdict, CompletionVerdict.STRENGTHEN);
});

test('a formally due revision calls for REVISE even with a low prerequisite risk', () => {
  const result = evaluateCompletionVerdict({ ...base, revisionDue: true });
  assert.equal(result.verdict, CompletionVerdict.REVISE);
});

test('retention visibly fading, even with nothing formally due, also calls for REVISE', () => {
  const result = evaluateCompletionVerdict({
    ...base,
    storedRetention: 0.8,
    effectiveRetention: COMPLETION_VERDICT_CONFIG.revisionRetentionFloor - 0.01,
  });
  assert.equal(result.verdict, CompletionVerdict.REVISE);
});

test('a never-revised topic (retention_score at its honest zero default) never misreads as REVISE', () => {
  // recordAttempt() only ever moves retention_score off zero on a
  // REVISION-mode attempt — zero here means "never measured," not "faded,"
  // and a decayed-from-zero effective value must never trigger REVISE.
  const result = evaluateCompletionVerdict({ ...base, storedRetention: 0, effectiveRetention: 0 });
  assert.notEqual(result.verdict, CompletionVerdict.REVISE);
});

test('a zero attempt count never triggers REVISE from decayed retention alone', () => {
  const result = evaluateCompletionVerdict({ ...base, storedRetention: 0.8, attemptCount: 0, effectiveRetention: 0.1 });
  assert.notEqual(result.verdict, CompletionVerdict.REVISE);
});

test('NEAR_MASTERY at or above the real nearMasteryFloor, unconfirmed, calls for REASSESS', () => {
  const result = evaluateCompletionVerdict({
    ...base,
    masteryGateStatus: MasteryGateStatus.NEAR_MASTERY,
    mastery: 0.82,
  });
  assert.equal(result.verdict, CompletionVerdict.REASSESS);
});

test('NEAR_MASTERY below the nearMasteryFloor (still building, not ready to reassess) is just CONTINUE', () => {
  const result = evaluateCompletionVerdict({
    ...base,
    masteryGateStatus: MasteryGateStatus.NEAR_MASTERY,
    mastery: 0.65,
  });
  assert.equal(result.verdict, CompletionVerdict.CONTINUE);
});

test('an otherwise unremarkable DEVELOPING/PRACTICING topic defaults to CONTINUE', () => {
  const result = evaluateCompletionVerdict(base);
  assert.equal(result.verdict, CompletionVerdict.CONTINUE);
});

test('every verdict carries a real reason, never an empty string', () => {
  for (const status of Object.values(MasteryGateStatus)) {
    const result = evaluateCompletionVerdict({ ...base, masteryGateStatus: status, mastery: 0.9 });
    assert.ok(typeof result.reason === 'string' && result.reason.length > 0, status);
  }
});
