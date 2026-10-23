/**
 * Phase 27.4 — Test Diagnostic Engine. Strengths/weaknesses/speed/
 * confidence/retention analysis already exist, unchanged, since Phase 10
 * (diagnostic.mjs — reused here, not reimplemented). Two real gaps close
 * here: (1) "cognitive problems" (guessing/careless errors) aren't
 * surfaced as their own report anywhere yet, even though every attempt's
 * real mistakeType (mistakes.mjs's classifyMistake(), unchanged) already
 * carries that exact taxonomy — this just aggregates it; (2) "previously
 * strong, now dropped" retention problems, composed from Phase 15's own
 * compareTopicAcrossTests() (unchanged) against a real prior test, rather
 * than a new comparison.
 */

import { STRONG_ACCURACY_THRESHOLD } from './diagnostic.mjs';
import { compareTopicAcrossTests, TEST_COMPARISON_CONFIG } from './testComparison.mjs';

/**
 * @param {Array<{mistakeType: string|null}>} results
 */
export function analyzeMistakePatterns(results) {
  const counts = { CONCEPTUAL: 0, CARELESS: 0, GUESS: 0, TIME_PRESSURE: 0, OVERCONFIDENT: 0, UNKNOWN: 0 };
  for (const r of results) {
    if (r.mistakeType && r.mistakeType in counts) counts[r.mistakeType] += 1;
  }
  const totalMistakes = Object.values(counts).reduce((a, b) => a + b, 0);
  const dominant =
    totalMistakes === 0
      ? null
      : Object.entries(counts).reduce((best, [type, n]) => (n > (best?.n ?? 0) ? { type, n } : best), null)?.type ?? null;

  return { counts, totalMistakes, dominant };
}

/**
 * The brief's literal "cognitive problems" list: overconfidence/
 * underconfidence (Phase 10's analyzeConfidenceIssues, unchanged), guessing
 * and careless errors (real mistakeType counts), time pressure (either a
 * real speed issue, Phase 10, or real TIME_PRESSURE-classified mistakes).
 *
 * @param {Array<object>} results
 * @param {Array<object>} confidenceIssues Phase 10's analyzeConfidenceIssues() output
 * @param {Array<object>} speedIssues Phase 10's analyzeSpeedIssues() output
 */
export function buildCognitiveProblems(results, confidenceIssues, speedIssues) {
  const mistakes = analyzeMistakePatterns(results);
  return {
    overconfidence: confidenceIssues.filter((i) => i.issueType === 'OVERCONFIDENT'),
    underconfidence: confidenceIssues.filter((i) => i.issueType === 'UNDERCONFIDENT'),
    guessing: { count: mistakes.counts.GUESS, reason: mistakes.counts.GUESS > 0 ? `${mistakes.counts.GUESS} answer(s) came faster than anyone could genuinely read the question` : null },
    carelessErrors: { count: mistakes.counts.CARELESS, reason: mistakes.counts.CARELESS > 0 ? `${mistakes.counts.CARELESS} real slip(s) on topics she otherwise handles well` : null },
    timePressure: { topics: speedIssues, mistakeCount: mistakes.counts.TIME_PRESSURE },
  };
}

/**
 * "Previously strong, current performance drops, knowledge decay detected,
 * revision recommended" — composed entirely from real prior-test evidence
 * via compareTopicAcrossTests() (Phase 15, unchanged). No prior test for a
 * topic means no verdict for it, never a guessed one.
 *
 * @param {Array<object>} currentTopics this test's summarizeByTopic().topics
 * @param {Map<string, object>} previousTopicsByTopicId topicId -> the same shape from her last completed test, or empty
 */
export function buildRetentionProblems(currentTopics, previousTopicsByTopicId) {
  const problems = [];
  for (const topic of currentTopics) {
    const previous = previousTopicsByTopicId.get(topic.topicId);
    if (!previous) continue; // no prior evidence — not a drop, just unknown
    if (previous.accuracy < STRONG_ACCURACY_THRESHOLD) continue; // wasn't strong before — not a retention story

    const comparison = compareTopicAcrossTests(previous, topic);
    if (comparison.accuracyGain <= TEST_COMPARISON_CONFIG.regressionCeiling) {
      problems.push({
        topicId: topic.topicId,
        topicName: topic.topicName,
        previouslyStrongAt: previous.accuracy,
        nowAt: topic.accuracy,
        drop: Math.abs(comparison.accuracyGain),
        reason: `${topic.topicName} was previously strong at ${previous.accuracy}% and has dropped to ${topic.accuracy}% — real knowledge decay, not a fresh weakness`,
        recommendation: 'REVISION',
      });
    }
  }
  return problems;
}
