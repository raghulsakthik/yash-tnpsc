import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeInterventionGains, assessInterventionEffectiveness, INTERVENTION_EFFECTIVENESS_CONFIG } from '../src/domain/intervention.mjs';
import { InterventionVerdict } from '../src/domain/enums.mjs';

test('computeInterventionGains is simply post minus baseline, rounded', () => {
  const gains = computeInterventionGains({ baselineScore: 0.4, postScore: 0.6, baselineRetention: 0.3, postRetention: 0.5 });
  assert.equal(gains.learningGain, 0.2);
  assert.equal(gains.retentionGain, 0.2);
});

test('computeInterventionGains can be negative — a real regression, not clamped away', () => {
  const gains = computeInterventionGains({ baselineScore: 0.7, postScore: 0.5, baselineRetention: 0.6, postRetention: 0.6 });
  assert.equal(gains.learningGain, -0.2);
  assert.equal(gains.retentionGain, 0);
});

test('a real gain above the floor reads IMPROVED', () => {
  const result = assessInterventionEffectiveness({ learningGain: INTERVENTION_EFFECTIVENESS_CONFIG.improvedGainFloor + 0.01 });
  assert.equal(result.verdict, InterventionVerdict.IMPROVED);
});

test('a real drop below the ceiling reads REGRESSED', () => {
  const result = assessInterventionEffectiveness({ learningGain: INTERVENTION_EFFECTIVENESS_CONFIG.regressedGainCeiling - 0.01 });
  assert.equal(result.verdict, InterventionVerdict.REGRESSED);
});

test('a tiny movement either way reads NO_CHANGE, not a false positive/negative', () => {
  const up = assessInterventionEffectiveness({ learningGain: 0.01 });
  const down = assessInterventionEffectiveness({ learningGain: -0.01 });
  const flat = assessInterventionEffectiveness({ learningGain: 0 });
  assert.equal(up.verdict, InterventionVerdict.NO_CHANGE);
  assert.equal(down.verdict, InterventionVerdict.NO_CHANGE);
  assert.equal(flat.verdict, InterventionVerdict.NO_CHANGE);
});
