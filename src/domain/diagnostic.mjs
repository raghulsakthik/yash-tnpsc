/**
 * Turns a completed assessment's graded questions into the initial learner
 * model: per-topic accuracy/speed/confidence/mistakes, a difficulty
 * breakdown, and — walking the existing prerequisite graph — which weak
 * topics trace back to a weaker foundation topic.
 *
 * Deliberately does not reclassify mistakes: each question has already been
 * graded through recordAttempt() (the one shared grading pipeline), which
 * already computed `mistakeType` from the learner's accuracy *at the time of
 * that attempt*. This module only aggregates what already happened.
 */

import { difficultyBand } from './difficulty.mjs';
import { weakestPrerequisite } from './selection.mjs';
import { TopicClassification, RecommendationAction } from './enums.mjs';

export const WEAK_ACCURACY_THRESHOLD = 60;
export const STRONG_ACCURACY_THRESHOLD = 80;

const MISTAKE_TYPES = ['GUESS', 'CARELESS', 'CONCEPTUAL', 'TIME_PRESSURE', 'OVERCONFIDENT', 'UNKNOWN'];

function emptyMistakeCounts() {
  return Object.fromEntries(MISTAKE_TYPES.map((t) => [t, 0]));
}

function average(values) {
  const present = values.filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

/**
 * @param {Array<object>} results one entry per graded question:
 *   {topicId, topicName, difficulty, correct, timeTakenMs, confidence, mistakeType}
 * @returns {{overall: object, topics: Array<object>}}
 */
export function summarizeByTopic(results) {
  const byTopic = new Map();

  for (const r of results) {
    if (!byTopic.has(r.topicId)) {
      byTopic.set(r.topicId, {
        topicId: r.topicId,
        topicName: r.topicName,
        questionCount: 0,
        correctCount: 0,
        timeTakenMs: [],
        confidences: [],
        mistakeCounts: emptyMistakeCounts(),
        difficultyBreakdown: {},
      });
    }
    const t = byTopic.get(r.topicId);
    t.questionCount += 1;
    if (r.correct) t.correctCount += 1;
    t.timeTakenMs.push(r.timeTakenMs);
    t.confidences.push(r.confidence);
    if (r.mistakeType) t.mistakeCounts[r.mistakeType] = (t.mistakeCounts[r.mistakeType] ?? 0) + 1;

    const band = difficultyBand(r.difficulty);
    if (!t.difficultyBreakdown[band]) t.difficultyBreakdown[band] = { count: 0, correct: 0 };
    t.difficultyBreakdown[band].count += 1;
    if (r.correct) t.difficultyBreakdown[band].correct += 1;
  }

  const topics = [...byTopic.values()].map((t) => {
    const accuracy = t.questionCount > 0 ? Math.round((t.correctCount / t.questionCount) * 10000) / 100 : 0;
    const difficultyBreakdown = Object.fromEntries(
      Object.entries(t.difficultyBreakdown).map(([band, { count, correct }]) => [
        band,
        { count, correct, accuracy: Math.round((correct / count) * 10000) / 100 },
      ])
    );

    return {
      topicId: t.topicId,
      topicName: t.topicName,
      questionCount: t.questionCount,
      correctCount: t.correctCount,
      accuracy,
      avgTimeTakenMs: average(t.timeTakenMs),
      avgConfidence: average(t.confidences),
      mistakeCounts: t.mistakeCounts,
      guessingRate: Math.round((t.mistakeCounts.GUESS / t.questionCount) * 10000) / 100,
      carelessRate: Math.round((t.mistakeCounts.CARELESS / t.questionCount) * 10000) / 100,
      difficultyBreakdown,
    };
  });

  const totalQuestions = results.length;
  const correctCount = results.filter((r) => r.correct).length;

  return {
    overall: {
      totalQuestions,
      correctCount,
      accuracy: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 10000) / 100 : 0,
    },
    topics,
  };
}

/**
 * Splits per-topic results into weak/strong buckets and, for every weak
 * topic, walks the prerequisite graph to find the weakest thing it rests on
 * — the same root-cause walk selection.mjs already does for the daily plan,
 * reused here rather than reimplemented.
 *
 * @param {Array<object>} topics output of summarizeByTopic().topics
 * @param {Map<string, Array<{id: string, strength: number}>>} prerequisiteGraph topic -> prerequisites
 * @returns {{weakTopics: string[], strongTopics: string[], prerequisiteGaps: Array<object>}}
 */
export function diagnosePrerequisiteGaps(topics, prerequisiteGraph) {
  const accuracyByTopic = new Map(topics.map((t) => [t.topicId, t.accuracy / 100]));
  const weakTopics = topics.filter((t) => t.accuracy < WEAK_ACCURACY_THRESHOLD).map((t) => t.topicId);
  const strongTopics = topics.filter((t) => t.accuracy >= STRONG_ACCURACY_THRESHOLD).map((t) => t.topicId);

  const prerequisiteGaps = [];
  for (const topicId of weakTopics) {
    const weakest = weakestPrerequisite(topicId, prerequisiteGraph, accuracyByTopic);
    if (weakest) {
      prerequisiteGaps.push({
        topicId,
        prerequisiteTopicId: weakest.topicId,
        prerequisiteAccuracy: Math.round(weakest.accuracy * 10000) / 100,
      });
    }
  }

  return { weakTopics, strongTopics, prerequisiteGaps };
}

// ------------------------------------------------------- Phase 4: the Foundation
// Test Diagnostic Engine. diagnosePrerequisiteGaps() above answers "which weak
// topics have a weak prerequisite" with a binary weak/strong split; the
// functions below answer the sharper question the gap analysis in
// docs/gap-analysis.md flagged as missing — "why is this topic weak, and what
// should happen as a result" — producing one of five states per topic and a
// concrete next action, not just a label.

// A prerequisite this weak is treated as broken: the dependent topic's own
// score cannot be trusted yet (she may have fluked a few right answers), so
// this overrides the dependent's own accuracy rather than averaging with it.
export const PREREQUISITE_BROKEN_THRESHOLD = 40;

/**
 * Classifies every topic into STRONG / WEAK / CRITICAL / PREREQUISITE_BLOCKED
 * / UNKNOWN, walking the prerequisite graph for *every* topic — not just the
 * ones that already look weak — so a topic that happened to score well is
 * still flagged if the thing it rests on is badly broken.
 *
 * @param {Array<object>} topics output of summarizeByTopic().topics
 * @param {Map<string, Array<{id: string, strength: number}>>} prerequisiteGraph topic -> prerequisites
 * @returns {Array<{topicId: string, classification: string, reason: string, weakestPrerequisite: {topicId: string, accuracy: number}|null}>}
 */
export function classifyTopics(topics, prerequisiteGraph) {
  const accuracyByTopic = new Map(topics.map((t) => [t.topicId, t.accuracy / 100]));

  return topics.map((t) => {
    if (t.questionCount === 0) {
      return {
        topicId: t.topicId,
        classification: TopicClassification.UNKNOWN,
        reason: `no evidence gathered on ${t.topicId} yet`,
        weakestPrerequisite: null,
      };
    }

    const weakest = weakestPrerequisite(t.topicId, prerequisiteGraph, accuracyByTopic);
    const weakestDto = weakest ? { topicId: weakest.topicId, accuracy: Math.round(weakest.accuracy * 10000) / 100 } : null;
    const prerequisiteBroken = weakestDto !== null && weakestDto.accuracy < PREREQUISITE_BROKEN_THRESHOLD;

    if (prerequisiteBroken) {
      return {
        topicId: t.topicId,
        classification: TopicClassification.PREREQUISITE_BLOCKED,
        reason: `${t.topicId} cannot be safely advanced yet — its prerequisite ${weakestDto.topicId} is at ${weakestDto.accuracy}%, well below the ${PREREQUISITE_BROKEN_THRESHOLD}% floor`,
        weakestPrerequisite: weakestDto,
      };
    }

    if (t.accuracy < WEAK_ACCURACY_THRESHOLD && weakestDto !== null) {
      return {
        topicId: t.topicId,
        classification: TopicClassification.CRITICAL,
        reason: `${t.topicId} is weak (${t.accuracy}%) and traces back to a weaker prerequisite, ${weakestDto.topicId} (${weakestDto.accuracy}%)`,
        weakestPrerequisite: weakestDto,
      };
    }

    if (t.accuracy < WEAK_ACCURACY_THRESHOLD) {
      return {
        topicId: t.topicId,
        classification: TopicClassification.WEAK,
        reason: `${t.topicId} is weak (${t.accuracy}%) on its own; no weaker prerequisite was found`,
        weakestPrerequisite: null,
      };
    }

    if (t.accuracy >= STRONG_ACCURACY_THRESHOLD) {
      return {
        topicId: t.topicId,
        classification: TopicClassification.STRONG,
        reason: `${t.topicId} is strong (${t.accuracy}%)`,
        weakestPrerequisite: null,
      };
    }

    // Between the WEAK and STRONG thresholds: developing, not yet a concern.
    // There is no sixth state for this in the brief, so it is reported as
    // WEAK (needs more practice) rather than invented a new label.
    return {
      topicId: t.topicId,
      classification: TopicClassification.WEAK,
      reason: `${t.topicId} is still developing (${t.accuracy}%)`,
      weakestPrerequisite: null,
    };
  });
}

/**
 * Turns each classification into one concrete next action — this is the
 * "do NOT immediately teach advanced Ratio, teach/reinforce Fractions
 * first" decision made explicit and machine-readable, not just a label.
 *
 * @param {Array<object>} classifications output of classifyTopics()
 * @returns {Array<{topicId: string, action: string, targetTopicId: string, reason: string}>}
 */
export function buildTopicRecommendations(classifications) {
  return classifications.map((c) => {
    switch (c.classification) {
      case TopicClassification.PREREQUISITE_BLOCKED:
        return {
          topicId: c.topicId,
          action: RecommendationAction.REINFORCE_PREREQUISITE,
          targetTopicId: c.weakestPrerequisite.topicId,
          reason: `Do not advance ${c.topicId} yet — reinforce ${c.weakestPrerequisite.topicId} first`,
        };
      case TopicClassification.CRITICAL:
        return {
          topicId: c.topicId,
          action: RecommendationAction.REINFORCE_PREREQUISITE,
          targetTopicId: c.weakestPrerequisite.topicId,
          reason: `Do not immediately teach advanced ${c.topicId} — teach/reinforce ${c.weakestPrerequisite.topicId} first`,
        };
      case TopicClassification.WEAK:
        return {
          topicId: c.topicId,
          action: RecommendationAction.REINFORCE_TOPIC,
          targetTopicId: c.topicId,
          reason: `${c.topicId} needs direct reinforcement`,
        };
      case TopicClassification.UNKNOWN:
        return {
          topicId: c.topicId,
          action: RecommendationAction.GATHER_EVIDENCE,
          targetTopicId: c.topicId,
          reason: `not enough evidence on ${c.topicId} yet`,
        };
      case TopicClassification.STRONG:
      default:
        return {
          topicId: c.topicId,
          action: RecommendationAction.ADVANCE,
          targetTopicId: c.topicId,
          reason: `${c.topicId} is ready to advance`,
        };
    }
  });
}

// ------------------------------------------------------- Phase 10: the Assessment
// Diagnostic Engine. summarizeByTopic() (TopicAnalyzer) and
// diagnosePrerequisiteGaps()/classifyTopics() (PrerequisiteAnalyzer) above
// already cover topic performance, difficulty performance, mistake patterns,
// and prerequisite failures. What's genuinely new here is the three
// analyses nothing yet produces — speed, confidence, and retention — plus
// strengths/weaknesses reshaped into the exact named output the brief asks
// for, assembled by an AssessmentAnalyzer-equivalent orchestrator in the
// service layer (not duplicated here as a second pipeline).

const SPEED_ISSUE_RATIO = 1.8; // avg actual/expected time ratio considered a speed issue
const CONFIDENCE_ISSUE_RATE = 0.4; // share of a topic's attempts that must be over/under-confident to flag it
const LOW_RETENTION_THRESHOLD = 0.5;

/**
 * TimeAnalyzer: topics where she is consistently taking much longer than a
 * question's own estimated_seconds — a method problem, not carelessness
 * (same distinction classifyMistake()'s TIME_PRESSURE case already draws
 * per-attempt; this is the topic-level pattern across the whole assessment).
 *
 * @param {Array<{topicId: string, topicName: string, timeTakenMs: number|null, estimatedSeconds: number}>} results
 * @returns {Array<{topicId: string, topicName: string, avgRatio: number, reason: string}>}
 */
export function analyzeSpeedIssues(results) {
  const byTopic = new Map();
  for (const r of results) {
    if (r.timeTakenMs === null || r.timeTakenMs === undefined) continue; // skipped questions carry no time signal
    if (!byTopic.has(r.topicId)) byTopic.set(r.topicId, { topicName: r.topicName, ratios: [] });
    const expectedMs = Math.max(1, (r.estimatedSeconds ?? 60) * 1000);
    byTopic.get(r.topicId).ratios.push(r.timeTakenMs / expectedMs);
  }

  const issues = [];
  for (const [topicId, { topicName, ratios }] of byTopic) {
    const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    if (avgRatio >= SPEED_ISSUE_RATIO) {
      issues.push({
        topicId,
        topicName,
        avgRatio: Math.round(avgRatio * 100) / 100,
        reason: `averaging ${avgRatio.toFixed(1)}x the expected time on ${topicName}`,
      });
    }
  }
  return issues;
}

/**
 * ConfidenceAnalyzer: topics where confidence and correctness disagree often
 * enough to be a pattern, not a one-off — overconfident-and-wrong (the
 * dangerous one: she won't go looking for what she got wrong) or
 * underconfident-and-right (she knows more than she thinks).
 *
 * @param {Array<{topicId: string, topicName: string, correct: boolean, confidence: number|null}>} results
 * @returns {Array<{topicId: string, topicName: string, issueType: 'OVERCONFIDENT'|'UNDERCONFIDENT', rate: number, reason: string}>}
 */
export function analyzeConfidenceIssues(results) {
  const byTopic = new Map();
  for (const r of results) {
    if (r.confidence === null || r.confidence === undefined) continue;
    if (!byTopic.has(r.topicId)) byTopic.set(r.topicId, { topicName: r.topicName, rows: [] });
    byTopic.get(r.topicId).rows.push(r);
  }

  const issues = [];
  for (const [topicId, { topicName, rows }] of byTopic) {
    const overconfidentWrong = rows.filter((r) => !r.correct && r.confidence >= 4).length / rows.length;
    const underconfidentRight = rows.filter((r) => r.correct && r.confidence <= 2).length / rows.length;

    if (overconfidentWrong >= CONFIDENCE_ISSUE_RATE) {
      issues.push({
        topicId,
        topicName,
        issueType: 'OVERCONFIDENT',
        rate: Math.round(overconfidentWrong * 10000) / 100,
        reason: `confident and wrong on ${topicName} ${Math.round(overconfidentWrong * 100)}% of the time — she won't know to go back and check it`,
      });
    } else if (underconfidentRight >= CONFIDENCE_ISSUE_RATE) {
      issues.push({
        topicId,
        topicName,
        issueType: 'UNDERCONFIDENT',
        rate: Math.round(underconfidentRight * 10000) / 100,
        reason: `unsure but right on ${topicName} ${Math.round(underconfidentRight * 100)}% of the time — she knows more of this than she thinks`,
      });
    }
  }
  return issues;
}

/**
 * Retention is not something this one assessment can measure on its own —
 * it comes from the spaced-repetition history already tracked by
 * recordAttempt()/revision.mjs (retention_score on learner_topic_state,
 * unchanged, read here not recomputed). A topic she is assessed on today
 * but whose tracked retention is already fading is a real, distinct risk
 * from "never learned it" or "learned it, forgot the method under time
 * pressure."
 *
 * @param {Array<{topicId: string, topicName: string}>} topics output of summarizeByTopic().topics
 * @param {Map<string, number>} retentionByTopic topicId -> retention_score (0..1), from learner_topic_state
 * @returns {Array<{topicId: string, topicName: string, retention: number, reason: string}>}
 */
export function analyzeRetentionIssues(topics, retentionByTopic) {
  const issues = [];
  for (const t of topics) {
    const retention = retentionByTopic.get(t.topicId);
    if (retention === undefined) continue; // never scheduled for revision — not a retention question yet
    if (retention < LOW_RETENTION_THRESHOLD) {
      issues.push({
        topicId: t.topicId,
        topicName: t.topicName,
        retention: Math.round(retention * 10000) / 100,
        reason: `${t.topicName}'s tracked retention has fallen to ${Math.round(retention * 100)}% — due for review, not just more new practice`,
      });
    }
  }
  return issues;
}

/**
 * Reshapes summarizeByTopic()'s weak/strong split into the richer
 * strengths/weaknesses objects the brief's output contract names — same
 * WEAK_ACCURACY_THRESHOLD/STRONG_ACCURACY_THRESHOLD, not a new judgment.
 *
 * @param {Array<object>} topics output of summarizeByTopic().topics
 * @returns {{strengths: Array<object>, weaknesses: Array<object>}}
 */
export function deriveStrengthsAndWeaknesses(topics) {
  const strengths = topics
    .filter((t) => t.accuracy >= STRONG_ACCURACY_THRESHOLD)
    .map((t) => ({ topicId: t.topicId, topicName: t.topicName, accuracy: t.accuracy }));
  const weaknesses = topics
    .filter((t) => t.accuracy < WEAK_ACCURACY_THRESHOLD)
    .map((t) => ({ topicId: t.topicId, topicName: t.topicName, accuracy: t.accuracy }));
  return { strengths, weaknesses };
}
