import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPyqSource } from '../src/lib/pyqSource.mjs';

test('blocks a clearly named previous-year paper', () => {
  const result = detectPyqSource('TNPSC Group II 2022 Question Paper.pdf', '');
  assert.equal(result.isPyq, true);
  assert.equal(result.reason, 'pyq-filename-marker');
});

test('blocks an official question booklet even when filename is generic', () => {
  const result = detectPyqSource('document.pdf', 'Question Booklet No.\nCCS2E/2022\nGENERAL STUDIES');
  assert.equal(result.isPyq, true);
  assert.equal(result.reason, 'official-question-booklet-marker');
});

test('does not block ordinary study notes that mention exam questions', () => {
  const result = detectPyqSource('Fundamental Rights Study Notes.pdf', 'Practice questions and examples about Fundamental Rights.');
  assert.equal(result.isPyq, false);
});

test('batch metadata with an explicit exam year keeps the source in the PYQ lane', () => {
  const result = detectPyqSource('upload.pdf', 'General Studies', {
    sourceYear: 2022,
    examCode: '495',
    examGroup: 'Group IIA',
  });
  assert.equal(result.isPyq, true);
  assert.equal(result.reason, 'explicit-exam-metadata');
});
