import crypto from 'crypto';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function contentEngineManifestHash(publicationId, items) {
  const canonical = canonicalize({
    publication_id: publicationId,
    items: items.map((x) => ({
      kind: x.kind,
      content_id: x.content_id,
      topic_id: x.topic_id,
      payload: x.payload,
    })),
  });
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function contentEngineManifestFixtureHash() {
  return contentEngineManifestHash('phase21-fixture', [
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
  ]);
}
