// Phase 19 — the Aptitude Assessment Layer's analysis step, built entirely
// from existing, unchanged pieces: "uses the same underlying infrastructure"
// is the brief's own instruction, and every domain function below already
// existed before this phase — Phase 3/9's blueprint/timing, Phase 4/10's
// classification and diagnostic report, Phase 11's adaptive decision
// engine. This service only gathers the weekly test's own already-graded
// data into the exact shape those functions already expect, and ties the
// result to a concrete next action per weak topic (the "Adaptive
// Intervention" step).
import { classifyMistake } from '../domain/mistakes.mjs';
import {
  summarizeByTopic,
  diagnosePrerequisiteGaps,
  classifyTopics,
  buildTopicRecommendations,
  analyzeSpeedIssues,
  analyzeConfidenceIssues,
  analyzeRetentionIssues,
  deriveStrengthsAndWeaknesses,
} from '../domain/diagnostic.mjs';
import { estimateAssessmentMinutes } from '../domain/defaultAssessment.mjs';
import { decideNextActionForTopic } from './adaptiveDecisionService.mjs';
import { findCompletedTest, findTestQuestionsWithAnswers } from '../repository/aptitudeAssessmentRepository.mjs';
import { findAccuracyForTopics } from '../repository/learnerStateRepository.mjs';
import { findPrerequisiteGraphForTopics, findRetentionForTopics } from '../repository/defaultAssessmentRepository.mjs';
import { NotFoundError, ValidationError } from './errors.mjs';

export async function analyzeAptitudeAssessment(testId) {
  const test = await findCompletedTest(testId);
  if (!test) throw new NotFoundError(`no test ${testId}`);
  if (test.status !== 'COMPLETED') throw new ValidationError([`test ${testId} is not completed yet`]);

  const rows = await findTestQuestionsWithAnswers(testId);
  const topicIds = [...new Set(rows.map((r) => r.topic_id))];
  const accuracyRows = await findAccuracyForTopics(test.learner_id, topicIds);
  const accuracyByTopic = new Map(accuracyRows.map((r) => [r.topic_id, r.accuracy]));

  // mistakeType is recomputed here, not read off question_attempt (which
  // has no link back to which test produced an attempt) — using *current*
  // topic accuracy as the classifier's input, an approximation of the
  // accuracy at the moment she actually took the test, not a stored
  // historical value. See docs/phase-19-completion.md.
  const results = rows.map((r) => {
    const answered = r.selected_index !== null && r.selected_index !== undefined;
    const correct = answered && r.selected_index === r.answer_index;
    const mistakeType = answered
      ? classifyMistake({
          correct,
          timeTakenMs: r.time_taken_ms ?? 0,
          expectedSeconds: r.estimated_seconds,
          confidence: null, // the weekly test does not currently collect confidence — see known limitations
          topicAccuracy: accuracyByTopic.get(r.topic_id) ?? 0,
        })
      : null;
    return {
      topicId: r.topic_id,
      topicName: r.topic_name,
      difficulty: r.difficulty,
      estimatedSeconds: r.estimated_seconds,
      correct,
      timeTakenMs: r.time_taken_ms ?? null,
      confidence: null,
      mistakeType,
    };
  });

  const diagnosticBase = summarizeByTopic(results);

  const graphRows = await findPrerequisiteGraphForTopics(topicIds);
  const prerequisiteGraph = new Map();
  for (const edge of graphRows) {
    if (!prerequisiteGraph.has(edge.topic_id)) prerequisiteGraph.set(edge.topic_id, []);
    prerequisiteGraph.get(edge.topic_id).push({ id: edge.prerequisite_topic_id, strength: edge.strength });
  }
  const gaps = diagnosePrerequisiteGaps(diagnosticBase.topics, prerequisiteGraph);
  const classifications = classifyTopics(diagnosticBase.topics, prerequisiteGraph);
  const recommendations = buildTopicRecommendations(classifications);

  const retentionRows = await findRetentionForTopics(test.learner_id, topicIds);
  const retentionByTopic = new Map(retentionRows.map((r) => [r.topic_id, r.retention]));
  const speedIssues = analyzeSpeedIssues(results);
  const confidenceIssues = analyzeConfidenceIssues(results); // always empty — no confidence data to analyze
  const retentionIssues = analyzeRetentionIssues(diagnosticBase.topics, retentionByTopic);
  const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(diagnosticBase.topics);

  const estimatedMinutes = estimateAssessmentMinutes(
    results.map((r) => ({ question: { estimatedSeconds: r.estimatedSeconds } }))
  );

  // Adaptive Intervention: a concrete next action per weak topic, from the
  // same engine (Phase 11) every other phase already uses — not a second
  // recommendation system.
  const adaptiveInterventions = await Promise.all(
    weaknesses.map(async (w) => ({ topicId: w.topicId, decision: await decideNextActionForTopic(test.learner_id, w.topicId) }))
  );

  return {
    testId,
    score: test.score,
    questionCount: test.question_count,
    estimatedMinutes,
    overall: diagnosticBase.overall,
    topics: diagnosticBase.topics,
    classifications,
    recommendations,
    report: {
      strengths,
      weaknesses,
      prerequisiteGaps: gaps.prerequisiteGaps,
      speedIssues,
      confidenceIssues,
      retentionIssues,
    },
    adaptiveInterventions,
  };
}
