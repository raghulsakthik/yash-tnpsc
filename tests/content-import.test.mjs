import test from 'node:test';
import assert from 'node:assert/strict';
import { ContentImportError, resolveMcqLanguage } from '../src/lib/contentImport.mjs';

test('retrieval-import preserves Tamil question language', () => {
  assert.equal(resolveMcqLanguage({ language: 'ta' }), 'ta');
});

test('retrieval-import preserves English question language', () => {
  assert.equal(resolveMcqLanguage({ language: 'en' }), 'en');
});

test('retrieval-import uses the explicit batch default when question language is omitted', () => {
  assert.equal(resolveMcqLanguage({}, 'ta'), 'ta');
});

test('retrieval-import rejects unsupported language rather than silently storing as English', () => {
  assert.throws(
    () => resolveMcqLanguage({ language: 'und' }),
    (error) => error instanceof ContentImportError && error.code === 'INVALID_LANGUAGE',
  );
});
