// Phase 15 — TestComparisonService: finds the two most recent completed
// assessments and runs the LearningGainCalculator (testComparison.mjs)
// across every topic they share.
import { compareTopicAcrossTests, decideInterventionNextStep } from '../domain/testComparison.mjs';
import { findRecentCompletedAssessments, findRecentCompletedAssessmentsForTopic } from '../repository/testComparisonRepository.mjs';

export async function compareLatestAssessments(learnerId) {
  const assessments = await findRecentCompletedAssessments(learnerId, 2);
  if (assessments.length < 2) {
    return {
      comparable: false,
      reason: `only ${assessments.length} completed assessment(s) so far — need at least 2 to compare`,
      topics: [],
    };
  }

  const [test2, test1] = assessments; // newest first
  const topicsById1 = new Map((test1.diagnostic.topics ?? []).map((t) => [t.topicId, t]));
  const topicsById2 = new Map((test2.diagnostic.topics ?? []).map((t) => [t.topicId, t]));
  const sharedTopicIds = [...topicsById1.keys()].filter((id) => topicsById2.has(id));

  const topics = sharedTopicIds.map((id) => {
    const comparison = compareTopicAcrossTests(topicsById1.get(id), topicsById2.get(id));
    const nextStep = decideInterventionNextStep({ accuracyGain: comparison.accuracyGain, test2Accuracy: comparison.test2Accuracy });
    return { ...comparison, nextStep };
  });

  return {
    comparable: true,
    test1AssessmentId: test1.id,
    test2AssessmentId: test2.id,
    test1CompletedAt: test1.completed_at,
    test2CompletedAt: test2.completed_at,
    overallGain: Math.round((test2.diagnostic.overall.accuracy - test1.diagnostic.overall.accuracy) * 100) / 100,
    topics,
  };
}

export async function compareTopicAcrossLatestTests(learnerId, topicId) {
  const assessments = await findRecentCompletedAssessmentsForTopic(learnerId, topicId, 2);
  if (assessments.length < 2) {
    return { comparable: false, reason: `fewer than 2 completed assessments have covered ${topicId} yet` };
  }

  const [test2, test1] = assessments;
  const topic1 = (test1.diagnostic.topics ?? []).find((t) => t.topicId === topicId);
  const topic2 = (test2.diagnostic.topics ?? []).find((t) => t.topicId === topicId);
  const comparison = compareTopicAcrossTests(topic1, topic2);
  const nextStep = decideInterventionNextStep({ accuracyGain: comparison.accuracyGain, test2Accuracy: comparison.test2Accuracy });

  return {
    comparable: true,
    test1AssessmentId: test1.id,
    test2AssessmentId: test2.id,
    test1CompletedAt: test1.completed_at,
    test2CompletedAt: test2.completed_at,
    ...comparison,
    nextStep,
  };
}
