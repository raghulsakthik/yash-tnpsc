import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTopicFrequencyReport,
  buildSubjectFrequencyReport,
  buildYearlyTrendReport,
  buildDifficultyDistributionReport,
  buildConceptFrequencyAnswer,
  FREQUENCY_DISCLAIMER,
} from '../src/domain/pyqIntelligence.mjs';

test('topic frequency report sorts most-frequent first and computes real shares', () => {
  const report = buildTopicFrequencyReport([
    { topicId: 'a', topicName: 'A', chapterId: 'c1', count: 2 },
    { topicId: 'b', topicName: 'B', chapterId: 'c1', count: 8 },
  ]);
  assert.equal(report.totalPyqQuestions, 10);
  assert.equal(report.topics[0].topicId, 'b');
  assert.equal(report.topics[0].share, 0.8);
  assert.equal(report.disclaimer, FREQUENCY_DISCLAIMER);
});

test('an empty topic frequency report never divides by zero', () => {
  const report = buildTopicFrequencyReport([]);
  assert.equal(report.totalPyqQuestions, 0);
  assert.deepEqual(report.topics, []);
});

test('subject frequency report carries the same disclaimer and real shares', () => {
  const report = buildSubjectFrequencyReport([{ subjectId: 's1', subjectName: 'S1', count: 5 }]);
  assert.equal(report.subjects[0].share, 1);
  assert.equal(report.disclaimer, FREQUENCY_DISCLAIMER);
});

test('yearly trend report sorts ascending and computes a real average', () => {
  const report = buildYearlyTrendReport([
    { year: 2018, count: 4 },
    { year: 2013, count: 2 },
  ]);
  assert.deepEqual(report.years.map((y) => y.year), [2013, 2018]);
  assert.equal(report.averagePerYear, 3);
  assert.equal(report.yearsCovered, 2);
});

test('difficulty distribution report never fabricates a band with no real questions', () => {
  const report = buildDifficultyDistributionReport([{ band: 'EASY', count: 3 }]);
  assert.equal(report.totalPyqQuestions, 3);
  assert.equal(report.bands.length, 1);
});

test('concept frequency answers honestly when nothing has been transcribed for it yet', () => {
  const answer = buildConceptFrequencyAnswer({ topicId: 'aptitude.hcf', count: 0, byYear: [] });
  assert.equal(answer.historicalCount, 0);
  assert.match(answer.answer, /No real past-paper question/);
  assert.equal(answer.disclaimer, FREQUENCY_DISCLAIMER);
});

test('concept frequency answers with a real count and never claims it predicts the future', () => {
  const answer = buildConceptFrequencyAnswer({ topicId: 'aptitude.hcf', count: 3, byYear: [{ year: 2018, count: 2 }, { year: 2013, count: 1 }] });
  assert.equal(answer.historicalCount, 3);
  assert.match(answer.answer, /appeared in 3 real/);
  assert.deepEqual(answer.byYear.map((y) => y.year), [2013, 2018]);
  assert.match(answer.disclaimer, /does not predict or guarantee/);
});
