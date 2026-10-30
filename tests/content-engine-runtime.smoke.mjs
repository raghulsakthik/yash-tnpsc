import assert from 'node:assert/strict';
import test from 'node:test';
import { contentEngineManifestHash } from '../src/lib/contentEngineManifest.mjs';

const items = [
  {
    kind: 'lesson',
    content_id: 'lesson-1',
    topic_id: 'aptitude.fractions',
    payload: {
      title: 'Fractions',
      concept: 'A fraction represents a part of a whole.',
      definition: 'A ratio of numerator to denominator.',
      explanation: 'Fractions describe parts of a whole.',
      examples: ['1/2 of 10 is 5'],
      revisionNotes: ['Numerator is above the denominator.'],
      sourceIds: ['evidence-1'],
      version: 1,
    },
  },
  {
    kind: 'mcq',
    content_id: 'mcq-1',
    topic_id: 'aptitude.fractions',
    payload: {
      question: 'Which represents one half?',
      options: ['1/2', '2/1', '1/3', '3/1'],
      answerIndex: 0,
      explanation: '1 divided by 2 equals one half.',
      difficulty: 'easy',
      sourceIds: ['evidence-1'],
      version: 1,
    },
  },
];

test('content-engine runtime contract produces a stable manifest hash', () => {
  const hash = contentEngineManifestHash('phase22-runtime-fixture', items);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, contentEngineManifestHash('phase22-runtime-fixture', items));
});

test('manifest changes when content changes', () => {
  const original = contentEngineManifestHash('phase22-runtime-fixture', items);
  const changed = contentEngineManifestHash('phase22-runtime-fixture', [
    ...items.slice(0, 1),
    { ...items[1], payload: { ...items[1].payload, answerIndex: 1 } },
  ]);
  assert.notEqual(original, changed);
});

test('manifest changes when publication identity changes', () => {
  const first = contentEngineManifestHash('phase22-runtime-fixture', items);
  const second = contentEngineManifestHash('phase22-runtime-fixture-2', items);
  assert.notEqual(first, second);
});
