import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeInterventionEffectivenessByTopic } from '../src/domain/intervention.mjs';
import { getVersionInfo, AI_VERSIONS } from '../src/domain/ai/versions.mjs';

test('per-topic effectiveness identifies the real, highest-average-gain intervention type for that topic', () => {
  const interventions = [
    { topicId: 't1', interventionType: 'PRACTICE', status: 'EVALUATED', learningGain: 0.05 },
    { topicId: 't1', interventionType: 'REVISION', status: 'EVALUATED', learningGain: 0.18 },
    { topicId: 't2', interventionType: 'PRACTICE', status: 'EVALUATED', learningGain: 0.1 },
  ];
  const result = summarizeInterventionEffectivenessByTopic(interventions);
  assert.equal(result.t1.mostEffective, 'REVISION');
  assert.equal(result.t2.mostEffective, 'PRACTICE');
});

test('an unevaluated intervention never counts toward a real topic\'s effectiveness', () => {
  const interventions = [{ topicId: 't1', interventionType: 'PRACTICE', status: 'ACTIVE', learningGain: null }];
  const result = summarizeInterventionEffectivenessByTopic(interventions);
  assert.deepEqual(result, {});
});

test('a topic with multiple real evaluated interventions of the same type averages them honestly', () => {
  const interventions = [
    { topicId: 't1', interventionType: 'PRACTICE', status: 'EVALUATED', learningGain: 0.1 },
    { topicId: 't1', interventionType: 'PRACTICE', status: 'EVALUATED', learningGain: 0.3 },
  ];
  const result = summarizeInterventionEffectivenessByTopic(interventions);
  assert.equal(result.t1.types[0].averageGain, 0.2);
  assert.equal(result.t1.types[0].count, 2);
});

test('every real AI capability in the registry has all five real version fields', () => {
  for (const capability of Object.keys(AI_VERSIONS)) {
    const info = getVersionInfo(capability);
    for (const key of ['modelVersion', 'promptVersion', 'retrievalVersion', 'datasetVersion', 'algorithmVersion']) {
      assert.ok(info[key], `${capability}.${key}`);
    }
  }
});

test('an unregistered capability returns an honest null, never a fabricated version', () => {
  assert.equal(getVersionInfo('not-a-real-capability'), null);
});
