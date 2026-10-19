import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeDecayFactor, estimateEffectiveRetention, RETENTION_DECAY_CONFIG } from '../src/domain/retentionEngine.mjs';

test('no elapsed-time evidence at all does not penalize — nothing to decay from', () => {
  assert.equal(timeDecayFactor(null), 1);
  assert.equal(timeDecayFactor(undefined), 1);
});

test('zero days elapsed is no decay at all', () => {
  assert.equal(timeDecayFactor(0), 1);
});

test('exactly one half-life halves the factor', () => {
  const factor = timeDecayFactor(RETENTION_DECAY_CONFIG.halfLifeDays);
  assert.ok(Math.abs(factor - 0.5) < 0.0001, factor);
});

test('two half-lives quarters it', () => {
  const factor = timeDecayFactor(RETENTION_DECAY_CONFIG.halfLifeDays * 2);
  assert.ok(Math.abs(factor - 0.25) < 0.0001, factor);
});

test('estimateEffectiveRetention with zero elapsed time and zero misconception risk just reports the stored value back', () => {
  const result = estimateEffectiveRetention({ storedRetention: 0.8, daysSinceLastStudied: 0, misconceptionRisk: 0 });
  assert.equal(result.effective, 0.8);
});

test('a long gap since last studied meaningfully lowers the effective estimate below the stored one', () => {
  const result = estimateEffectiveRetention({ storedRetention: 0.8, daysSinceLastStudied: RETENTION_DECAY_CONFIG.halfLifeDays, misconceptionRisk: 0 });
  assert.ok(result.effective < 0.8, result.effective);
  assert.ok(Math.abs(result.effective - 0.4) < 0.01, result.effective); // 0.8 * 0.5
});

test('real misconception risk further discounts the estimate, on top of time decay', () => {
  const noRisk = estimateEffectiveRetention({ storedRetention: 0.8, daysSinceLastStudied: 0, misconceptionRisk: 0 });
  const withRisk = estimateEffectiveRetention({ storedRetention: 0.8, daysSinceLastStudied: 0, misconceptionRisk: 0.8 });
  assert.ok(withRisk.effective < noRisk.effective, `expected ${withRisk.effective} < ${noRisk.effective}`);
});

test('no storage value is ever negative or above 1, however extreme the inputs', () => {
  const result = estimateEffectiveRetention({ storedRetention: 0.95, daysSinceLastStudied: 10000, misconceptionRisk: 1 });
  assert.ok(result.effective >= 0 && result.effective <= 1, result.effective);
});
