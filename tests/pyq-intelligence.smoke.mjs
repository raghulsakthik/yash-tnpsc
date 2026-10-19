#!/usr/bin/env node
// Phase 26.2 exit test, against a real database:
//
//   DATABASE_URL=... node tests/pyq-intelligence.smoke.mjs
//
// Proves the PYQ Knowledge Mapping reads real, transcribed past-paper data
// (137 real questions across 7 real years, seeded since Phases 20/21) —
// never invented counts — and that every frequency answer carries the
// brief's own required non-prediction disclaimer.

import pg from 'pg';
import { getTopicFrequency, getSubjectFrequency, getYearlyTrends, getDifficultyDistribution, getConceptFrequency, getPyqTrends } from '../src/services/pyqIntelligenceService.mjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const failures = [];
const check = (label, condition, detail = '') => {
  if (condition) console.log(`  ok   ${label}`);
  else {
    console.log(`  FAIL ${label} ${detail}`);
    failures.push(label);
  }
};

const { rows: totalRows } = await client.query(`SELECT COUNT(*)::int AS n FROM question WHERE source LIKE 'tnpsc-%' AND status = 'PUBLISHED'`);
const realTotal = totalRows[0].n;
check('the seeded bank has real, transcribed PYQ content to report on', realTotal > 0, realTotal);

console.log('\nTopic frequency reflects the real transcribed count exactly\n');

const topicFreq = await getTopicFrequency();
check('the topic-level total matches the real count exactly', topicFreq.totalPyqQuestions === realTotal, `${topicFreq.totalPyqQuestions} vs ${realTotal}`);
check('every topic entry is real content, not fabricated', topicFreq.topics.every((t) => t.count > 0));
check('the frequency disclaimer is present', /does not predict or guarantee/.test(topicFreq.disclaimer));

console.log('\nSubject frequency also matches the real total\n');

const subjectFreq = await getSubjectFrequency();
check('the subject-level total matches the real count exactly', subjectFreq.subjects.reduce((s, r) => s + r.count, 0) === realTotal);

console.log('\nYearly trends reflect the real seeded years, not an invented 2011-2025 range\n');

const years = await getYearlyTrends();
check('every year reported is one of the real seeded years', years.years.every((y) => [2013, 2015, 2016, 2017, 2018, 2022, 2024].includes(y.year)));
check('the gap-year disclaimer is honest about untranscribed years', /not the complete 2011-2025/.test(years.disclaimer));

console.log('\nDifficulty distribution sums to the real total\n');

const difficulty = await getDifficultyDistribution();
check('difficulty bands sum to the real total', difficulty.bands.reduce((s, r) => s + r.count, 0) === realTotal);

console.log('\n"How frequently has this concept appeared?" — answered honestly, both ways\n');

const realTopicFrequency = await getConceptFrequency('aptitude.hcf');
check('a real, transcribed topic reports a real, positive count', realTopicFrequency.historicalCount > 0, realTopicFrequency.historicalCount);
check('its answer text reports the real count', realTopicFrequency.answer.includes(String(realTopicFrequency.historicalCount)));

const untouchedTopicFrequency = await getConceptFrequency('polity.judiciary');
check('a real topic with no transcribed PYQ content reports zero, not an error', untouchedTopicFrequency.historicalCount === 0);
check('its answer is honest about having nothing transcribed yet', /No real past-paper question/.test(untouchedTopicFrequency.answer));

console.log('\nGET /api/v1/pyq/trends bundles everything into one real call\n');

const trends = await getPyqTrends();
check('the bundled trends report carries all four real sub-reports', ['topicFrequency', 'subjectFrequency', 'yearlyTrends', 'difficultyDistribution'].every((k) => k in trends));

await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('pyq knowledge mapping smoke test passed');
