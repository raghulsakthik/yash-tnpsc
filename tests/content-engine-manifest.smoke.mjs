import assert from 'node:assert/strict';
import test from 'node:test';
import { contentEngineManifestHash, contentEngineManifestFixtureHash } from '../src/lib/contentEngineManifest.mjs';

const items = [
  {
    kind: 'lesson',
    content_id: 'lesson-1',
    topic_id: 'aptitude.fractions',
    payload: { title: 'Fractions', sourceIds: ['evidence-1'], version: 1, nested: { b: 2, a: 'x' } },
  },
  {
    kind: 'mcq',
    content_id: 'mcq-1',
    topic_id: 'aptitude.fractions',
    payload: { question: 'Which?', options: ['1/2', '2'], answerIndex: 1, explanation: 'Because.', difficulty: 'easy', sourceIds: ['evidence-1'], version: 1 },
  },
];

test('content-engine manifest hash matches shared cross-language fixture', () => {
  assert.equal(contentEngineManifestHash('phase21-fixture', items), '58fb9c7e0bf727fb42df5cd4470353570b6c3c48a946db7d9c9f4e686ef01ceb');
  assert.equal(contentEngineManifestFixtureHash(), '58fb9c7e0bf727fb42df5cd4470353570b6c3c48a946db7d9c9f4e686ef01ceb');
});

test('manifest hashing is insensitive to object key insertion order', () => {
  const reordered = items.map((item) => ({
    topic_id: item.topic_id,
    payload: { ...item.payload },
    content_id: item.content_id,
    kind: item.kind,
  }));
  assert.equal(contentEngineManifestHash('phase21-fixture', reordered), contentEngineManifestHash('phase21-fixture', items));
});
