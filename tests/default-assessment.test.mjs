import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEligibility, buildDefaultAssessmentBlueprint, FOUNDATION_QUESTIONS_PER_TOPIC } from '../src/domain/defaultAssessment.mjs';
import {
  summarizeByTopic,
  diagnosePrerequisiteGaps,
  classifyTopics,
  buildTopicRecommendations,
  WEAK_ACCURACY_THRESHOLD,
  STRONG_ACCURACY_THRESHOLD,
  PREREQUISITE_BROKEN_THRESHOLD,
} from '../src/domain/diagnostic.mjs';
import { TopicClassification, RecommendationAction } from '../src/domain/enums.mjs';

test('eligibility requires most, not all, candidate topics to show exposure', () => {
  const candidateTopicIds = ['a', 'b', 'c', 'd', 'e'];

  const none = evaluateEligibility({ candidateTopicIds, exposedTopicIds: [] });
  assert.equal(none.eligible, false);

  const most = evaluateEligibility({ candidateTopicIds, exposedTopicIds: ['a', 'b', 'c', 'd'] });
  assert.equal(most.eligible, true);
  assert.equal(most.exposedCount, 4);

  const all = evaluateEligibility({ candidateTopicIds, exposedTopicIds: candidateTopicIds });
  assert.equal(all.eligible, true);
});

test('eligibility is false, not thrown, when there are no candidate topics yet', () => {
  const result = evaluateEligibility({ candidateTopicIds: [], exposedTopicIds: [] });
  assert.equal(result.eligible, false);
  assert.match(result.reason, /no foundation topics/);
});

test('the blueprint picks up to FOUNDATION_QUESTIONS_PER_TOPIC per topic, spread by difficulty', () => {
  const questions = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, difficulty: i / 20 }));
  const blueprint = buildDefaultAssessmentBlueprint([{ topicId: 't1', questions }], new Set());
  assert.equal(blueprint.length, FOUNDATION_QUESTIONS_PER_TOPIC);
  assert.ok(blueprint.every((b) => b.topicId === 't1'));
});

test('the blueprint never asks for more questions than a thin topic bank has', () => {
  const questions = [{ id: 'q1', difficulty: 0.2 }, { id: 'q2', difficulty: 0.4 }];
  const blueprint = buildDefaultAssessmentBlueprint([{ topicId: 't1', questions }], new Set());
  assert.equal(blueprint.length, 2);
});

test('summarizeByTopic reproduces the example report shape: a per-topic accuracy percentage', () => {
  const results = [
    { topicId: 'aptitude.fractions', topicName: 'Fractions', difficulty: 0.3, correct: false, timeTakenMs: 20000, confidence: 3, mistakeType: 'CONCEPTUAL' },
    { topicId: 'aptitude.fractions', topicName: 'Fractions', difficulty: 0.3, correct: true, timeTakenMs: 15000, confidence: 4, mistakeType: null },
    { topicId: 'aptitude.decimals', topicName: 'Decimals', difficulty: 0.2, correct: true, timeTakenMs: 10000, confidence: 4, mistakeType: null },
  ];
  const { overall, topics } = summarizeByTopic(results);

  assert.equal(overall.totalQuestions, 3);
  assert.equal(overall.correctCount, 2);

  const fractions = topics.find((t) => t.topicId === 'aptitude.fractions');
  assert.equal(fractions.accuracy, 50);
  assert.equal(fractions.mistakeCounts.CONCEPTUAL, 1);

  const decimals = topics.find((t) => t.topicId === 'aptitude.decimals');
  assert.equal(decimals.accuracy, 100);
});

test('guessing and careless rates are visible per topic', () => {
  const results = [
    { topicId: 't1', topicName: 'T1', difficulty: 0.3, correct: false, timeTakenMs: 2000, confidence: null, mistakeType: 'GUESS' },
    { topicId: 't1', topicName: 'T1', difficulty: 0.3, correct: false, timeTakenMs: 9000, confidence: 2, mistakeType: 'CARELESS' },
  ];
  const { topics } = summarizeByTopic(results);
  assert.equal(topics[0].guessingRate, 50);
  assert.equal(topics[0].carelessRate, 50);
});

test('weak and strong topics split at the documented thresholds', () => {
  const topics = [
    { topicId: 'weak', accuracy: WEAK_ACCURACY_THRESHOLD - 1 },
    { topicId: 'middling', accuracy: (WEAK_ACCURACY_THRESHOLD + STRONG_ACCURACY_THRESHOLD) / 2 },
    { topicId: 'strong', accuracy: STRONG_ACCURACY_THRESHOLD },
  ];
  const { weakTopics, strongTopics } = diagnosePrerequisiteGaps(topics, new Map());
  assert.deepEqual(weakTopics, ['weak']);
  assert.deepEqual(strongTopics, ['strong']);
});

test('a weak topic traces back to its weakest prerequisite', () => {
  const topics = [
    { topicId: 'percentage', accuracy: 40 },
    { topicId: 'fractions', accuracy: 30 },
  ];
  const graph = new Map([['percentage', [{ id: 'fractions', strength: 0.85 }]]]);
  const { prerequisiteGaps } = diagnosePrerequisiteGaps(topics, graph);
  assert.equal(prerequisiteGaps.length, 1);
  assert.equal(prerequisiteGaps[0].topicId, 'percentage');
  assert.equal(prerequisiteGaps[0].prerequisiteTopicId, 'fractions');
});

test('a weak topic with no weak prerequisite gets no gap entry', () => {
  const topics = [
    { topicId: 'percentage', accuracy: 40 },
    { topicId: 'fractions', accuracy: 95 },
  ];
  const graph = new Map([['percentage', [{ id: 'fractions', strength: 0.85 }]]]);
  const { prerequisiteGaps } = diagnosePrerequisiteGaps(topics, graph);
  assert.equal(prerequisiteGaps.length, 0);
});

// ------------------------------------------------------------ Phase 4 tests

test('the worked example classifies correctly: Fractions=Weak, Ratio=Critical, Basic Operations=Strong', () => {
  const topics = [
    { topicId: 'fractions', accuracy: 42, questionCount: 5 },
    { topicId: 'ratio', accuracy: 38, questionCount: 5 },
    { topicId: 'basic-operations', accuracy: 91, questionCount: 5 },
  ];
  // Ratio -> Fractions prerequisite, per the brief.
  const graph = new Map([['ratio', [{ id: 'fractions', strength: 0.8 }]]]);

  const classifications = classifyTopics(topics, graph);
  const byTopic = Object.fromEntries(classifications.map((c) => [c.topicId, c]));

  assert.equal(byTopic.fractions.classification, TopicClassification.WEAK);
  assert.equal(byTopic.ratio.classification, TopicClassification.CRITICAL);
  assert.equal(byTopic.ratio.weakestPrerequisite.topicId, 'fractions');
  assert.equal(byTopic['basic-operations'].classification, TopicClassification.STRONG);
});

test('a topic with no evidence is UNKNOWN, not WEAK', () => {
  const topics = [{ topicId: 'untested', accuracy: 0, questionCount: 0 }];
  const [c] = classifyTopics(topics, new Map());
  assert.equal(c.classification, TopicClassification.UNKNOWN);
});

test('a badly broken prerequisite blocks the dependent even if it scored fine on its own', () => {
  const topics = [
    { topicId: 'advanced', accuracy: 85, questionCount: 5 }, // looks strong on its own
    { topicId: 'foundation', accuracy: 25, questionCount: 5 }, // well below PREREQUISITE_BROKEN_THRESHOLD
  ];
  assert.ok(25 < PREREQUISITE_BROKEN_THRESHOLD);
  const graph = new Map([['advanced', [{ id: 'foundation', strength: 0.8 }]]]);

  const [advanced] = classifyTopics(topics, graph).filter((c) => c.topicId === 'advanced');
  assert.equal(advanced.classification, TopicClassification.PREREQUISITE_BLOCKED);
  assert.equal(advanced.weakestPrerequisite.topicId, 'foundation');
});

test('a weak topic with no weak prerequisite is WEAK, not CRITICAL', () => {
  const topics = [
    { topicId: 'standalone', accuracy: 45, questionCount: 5 },
    { topicId: 'its-prereq', accuracy: 95, questionCount: 5 },
  ];
  const graph = new Map([['standalone', [{ id: 'its-prereq', strength: 0.8 }]]]);
  const [c] = classifyTopics(topics, graph).filter((t) => t.topicId === 'standalone');
  assert.equal(c.classification, TopicClassification.WEAK);
  assert.equal(c.weakestPrerequisite, null);
});

test('recommendations turn CRITICAL into "reinforce the prerequisite, not the topic"', () => {
  const classifications = [
    { topicId: 'ratio', classification: TopicClassification.CRITICAL, weakestPrerequisite: { topicId: 'fractions', accuracy: 38 } },
  ];
  const [rec] = buildTopicRecommendations(classifications);
  assert.equal(rec.action, RecommendationAction.REINFORCE_PREREQUISITE);
  assert.equal(rec.targetTopicId, 'fractions');
  assert.match(rec.reason, /Do not immediately teach advanced ratio/);
});

test('every classification maps to exactly one recommendation action', () => {
  const classifications = [
    { topicId: 'a', classification: TopicClassification.STRONG, weakestPrerequisite: null },
    { topicId: 'b', classification: TopicClassification.WEAK, weakestPrerequisite: null },
    { topicId: 'c', classification: TopicClassification.CRITICAL, weakestPrerequisite: { topicId: 'x', accuracy: 10 } },
    { topicId: 'd', classification: TopicClassification.PREREQUISITE_BLOCKED, weakestPrerequisite: { topicId: 'y', accuracy: 5 } },
    { topicId: 'e', classification: TopicClassification.UNKNOWN, weakestPrerequisite: null },
  ];
  const recommendations = buildTopicRecommendations(classifications);
  assert.deepEqual(
    recommendations.map((r) => r.action),
    [
      RecommendationAction.ADVANCE,
      RecommendationAction.REINFORCE_TOPIC,
      RecommendationAction.REINFORCE_PREREQUISITE,
      RecommendationAction.REINFORCE_PREREQUISITE,
      RecommendationAction.GATHER_EVIDENCE,
    ]
  );
});

// ------------------------------------------------------------ Phase 5 tests

import { buildLearningPath, PathStepType } from '../src/domain/learningPath.mjs';

test('Learner A (weak fractions) gets a bent path: foundation+practice on fractions, then a foundation-only stop on percentage', () => {
  const syllabusOrder = ['numbers', 'fractions', 'percentage'];
  const classifications = classifyTopics(
    [
      { topicId: 'numbers', accuracy: 95, questionCount: 5 },
      { topicId: 'fractions', accuracy: 45, questionCount: 5 },
      { topicId: 'percentage', accuracy: 52, questionCount: 5 },
    ],
    new Map([['percentage', [{ id: 'fractions', strength: 0.85 }]]])
  );

  const path = buildLearningPath(syllabusOrder, classifications);

  assert.deepEqual(
    path.steps.map((s) => `${s.topicId}:${s.type}`),
    ['numbers:ADVANCE', 'fractions:FOUNDATION', 'fractions:PRACTICE', 'percentage:FOUNDATION']
  );
  assert.equal(path.blocked, true);
  assert.match(path.blockedReason, /fractions/);
});

test('Learner B (strong throughout) gets a straight-line path through the whole syllabus', () => {
  const syllabusOrder = ['numbers', 'fractions', 'percentage', 'ratio'];
  const classifications = classifyTopics(
    [
      { topicId: 'numbers', accuracy: 95, questionCount: 5 },
      { topicId: 'fractions', accuracy: 91, questionCount: 5 },
      { topicId: 'percentage', accuracy: 87, questionCount: 5 },
      { topicId: 'ratio', accuracy: 82, questionCount: 5 },
    ],
    new Map([['percentage', [{ id: 'fractions', strength: 0.85 }]], ['ratio', [{ id: 'fractions', strength: 0.8 }]]])
  );

  const path = buildLearningPath(syllabusOrder, classifications);

  assert.deepEqual(
    path.steps.map((s) => s.type),
    [PathStepType.ADVANCE, PathStepType.ADVANCE, PathStepType.ADVANCE, PathStepType.ADVANCE]
  );
  assert.equal(path.blocked, false);
  assert.equal(path.blockedReason, null);
});

test('the same syllabus order produces a different journey depending only on the classification', () => {
  const syllabusOrder = ['numbers', 'fractions', 'percentage', 'ratio'];
  const graph = new Map([['percentage', [{ id: 'fractions', strength: 0.85 }]], ['ratio', [{ id: 'fractions', strength: 0.8 }]]]);

  const weakPath = buildLearningPath(
    syllabusOrder,
    classifyTopics(
      [
        { topicId: 'numbers', accuracy: 95, questionCount: 5 },
        { topicId: 'fractions', accuracy: 45, questionCount: 5 },
        { topicId: 'percentage', accuracy: 52, questionCount: 5 },
        { topicId: 'ratio', accuracy: 50, questionCount: 5 },
      ],
      graph
    )
  );
  const strongPath = buildLearningPath(
    syllabusOrder,
    classifyTopics(
      [
        { topicId: 'numbers', accuracy: 95, questionCount: 5 },
        { topicId: 'fractions', accuracy: 91, questionCount: 5 },
        { topicId: 'percentage', accuracy: 87, questionCount: 5 },
        { topicId: 'ratio', accuracy: 82, questionCount: 5 },
      ],
      graph
    )
  );

  assert.notDeepEqual(weakPath.steps, strongPath.steps);
  assert.equal(weakPath.blocked, true);
  assert.equal(strongPath.blocked, false);
  // Ratio never gets reached in the weak path — it stops at percentage.
  assert.ok(!weakPath.steps.some((s) => s.topicId === 'ratio'));
  assert.ok(strongPath.steps.some((s) => s.topicId === 'ratio'));
});

test('a topic missing from the classification set is treated as UNKNOWN and does not block the path', () => {
  const path = buildLearningPath(['a', 'b'], [{ topicId: 'a', classification: TopicClassification.STRONG, reason: 'ok', weakestPrerequisite: null }]);
  assert.deepEqual(
    path.steps.map((s) => s.type),
    [PathStepType.ADVANCE, PathStepType.GATHER_EVIDENCE]
  );
  assert.equal(path.blocked, false);
});

// ------------------------------------------------------------ Phase 9 tests

import {
  computePrerequisiteFanOut,
  buildWeightedDefaultAssessmentBlueprint,
  estimateAssessmentMinutes,
} from '../src/domain/defaultAssessment.mjs';

test('prerequisite fan-out counts how many candidate topics depend on each one', () => {
  // division <- whole-numbers; fractions <- division; decimals <- fractions;
  // percentage <- fractions, decimals. Mirrors the real seeded shape.
  const topicIds = ['whole-numbers', 'division', 'fractions', 'decimals', 'percentage'];
  const graph = new Map([
    ['division', [{ id: 'whole-numbers', strength: 0.8 }]],
    ['fractions', [{ id: 'division', strength: 0.85 }]],
    ['decimals', [{ id: 'fractions', strength: 0.75 }]],
    ['percentage', [{ id: 'fractions', strength: 0.85 }, { id: 'decimals', strength: 0.75 }]],
  ]);
  const fanOut = computePrerequisiteFanOut(topicIds, graph);

  assert.equal(fanOut.get('whole-numbers'), 1); // division depends on it
  assert.equal(fanOut.get('fractions'), 2); // decimals AND percentage depend on it
  assert.equal(fanOut.get('percentage'), 0); // nothing depends on percentage
});

test('the weighted blueprint gives a high fan-out topic more of the same total budget than a leaf topic', () => {
  const manyQuestions = Array.from({ length: 20 }, (_, i) => ({ id: `f${i}`, difficulty: i / 20 }));
  const fewQuestions = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, difficulty: i / 20 }));
  const topicPools = [
    { topicId: 'fractions', questions: manyQuestions },
    { topicId: 'percentage', questions: fewQuestions },
  ];
  const graph = new Map([['percentage', [{ id: 'fractions', strength: 0.85 }]]]);

  const picked = buildWeightedDefaultAssessmentBlueprint(topicPools, new Set(), graph);
  const fractionsCount = picked.filter((p) => p.topicId === 'fractions').length;
  const percentageCount = picked.filter((p) => p.topicId === 'percentage').length;

  assert.ok(fractionsCount > percentageCount, `expected fractions (${fractionsCount}) > percentage (${percentageCount})`);
  assert.equal(picked.length, 2 * FOUNDATION_QUESTIONS_PER_TOPIC); // same total budget as the flat version
});

test('the weighted blueprint falls back to an even split when nothing depends on anything', () => {
  const questions = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, difficulty: i / 20 }));
  const topicPools = [
    { topicId: 'a', questions },
    { topicId: 'b', questions },
  ];
  const picked = buildWeightedDefaultAssessmentBlueprint(topicPools, new Set(), new Map());
  assert.equal(picked.filter((p) => p.topicId === 'a').length, picked.filter((p) => p.topicId === 'b').length);
});

test('estimateAssessmentMinutes sums real per-question estimates, not a flat guess', () => {
  const picked = [
    { question: { estimatedSeconds: 30 } },
    { question: { estimatedSeconds: 60 } },
    { question: { estimatedSeconds: 90 } },
  ];
  assert.equal(estimateAssessmentMinutes(picked), 3); // 180s / 60
});

// ----------------------------------------------------------- Phase 10 tests

import {
  analyzeSpeedIssues,
  analyzeConfidenceIssues,
  analyzeRetentionIssues,
  deriveStrengthsAndWeaknesses,
} from '../src/domain/diagnostic.mjs';

test('analyzeSpeedIssues flags a topic averaging well over its expected time, not a topic bang on pace', () => {
  const results = [
    { topicId: 'slow', topicName: 'Slow Topic', timeTakenMs: 100000, estimatedSeconds: 30 },
    { topicId: 'slow', topicName: 'Slow Topic', timeTakenMs: 90000, estimatedSeconds: 30 },
    { topicId: 'onpace', topicName: 'On Pace', timeTakenMs: 30000, estimatedSeconds: 30 },
  ];
  const issues = analyzeSpeedIssues(results);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].topicId, 'slow');
});

test('analyzeSpeedIssues ignores skipped questions (no timeTakenMs) rather than treating them as instant', () => {
  const results = [
    { topicId: 't', topicName: 'T', timeTakenMs: null, estimatedSeconds: 30 },
    { topicId: 't', topicName: 'T', timeTakenMs: 30000, estimatedSeconds: 30 },
  ];
  assert.equal(analyzeSpeedIssues(results).length, 0);
});

test('analyzeConfidenceIssues flags a topic that is repeatedly confident-and-wrong as OVERCONFIDENT', () => {
  const results = [
    { topicId: 't', topicName: 'T', correct: false, confidence: 5 },
    { topicId: 't', topicName: 'T', correct: false, confidence: 4 },
    { topicId: 't', topicName: 'T', correct: true, confidence: 5 },
  ];
  const [issue] = analyzeConfidenceIssues(results);
  assert.equal(issue.issueType, 'OVERCONFIDENT');
});

test('analyzeConfidenceIssues flags a topic that is repeatedly unsure-but-right as UNDERCONFIDENT', () => {
  const results = [
    { topicId: 't', topicName: 'T', correct: true, confidence: 1 },
    { topicId: 't', topicName: 'T', correct: true, confidence: 2 },
    { topicId: 't', topicName: 'T', correct: false, confidence: 2 },
  ];
  const [issue] = analyzeConfidenceIssues(results);
  assert.equal(issue.issueType, 'UNDERCONFIDENT');
});

test('analyzeConfidenceIssues stays quiet when confidence and correctness mostly agree', () => {
  const results = [
    { topicId: 't', topicName: 'T', correct: true, confidence: 4 },
    { topicId: 't', topicName: 'T', correct: false, confidence: 2 },
  ];
  assert.equal(analyzeConfidenceIssues(results).length, 0);
});

test('analyzeRetentionIssues flags a topic whose tracked retention has faded, and skips one never scheduled', () => {
  const topics = [
    { topicId: 'fading', topicName: 'Fading' },
    { topicId: 'solid', topicName: 'Solid' },
    { topicId: 'new', topicName: 'New' },
  ];
  const retentionByTopic = new Map([['fading', 0.3], ['solid', 0.9]]); // 'new' absent — never scheduled
  const issues = analyzeRetentionIssues(topics, retentionByTopic);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].topicId, 'fading');
});

test('deriveStrengthsAndWeaknesses matches the documented thresholds', () => {
  const topics = [
    { topicId: 'strong', topicName: 'Strong', accuracy: 90 },
    { topicId: 'weak', topicName: 'Weak', accuracy: 30 },
    { topicId: 'middling', topicName: 'Middling', accuracy: 70 },
  ];
  const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(topics);
  assert.deepEqual(strengths.map((s) => s.topicId), ['strong']);
  assert.deepEqual(weaknesses.map((w) => w.topicId), ['weak']);
});
