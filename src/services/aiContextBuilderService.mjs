// Phase 29.5 — AIContextBuilder. Composes learner state + question + topic
// knowledge + mistake history into the compact context every prompt
// template (29.5) and deterministic fallback consumes — reusing Phase 6's
// digital twin, Phase 3's prerequisite reads, Phase 29.1's approved
// content, unchanged. Only what the model needs goes in, same discipline
// buildHintContext() (Phase 8) already set.
import { getTopicState } from './learnerStateService.mjs';
import { getEffectiveRetention } from './retentionEngineService.mjs';
import { getRecommendations } from './recommendationService.mjs';
import { detectTopicPatterns } from '../domain/aiPatternDetection.mjs';
import { analyzeConfidenceIssues } from '../domain/diagnostic.mjs';
import { findApprovedQuestionsForTopic, findQuestionById, findTopicById, findPrerequisiteTopicsWithNames } from '../repository/aiKnowledgeRepository.mjs';
import { findRecentAttemptsForTopic } from '../repository/learnerStateRepository.mjs';
import { NotFoundError } from './errors.mjs';

export async function buildTopicContext(learnerId, topicId) {
  const topic = await findTopicById(topicId);
  if (!topic) throw new NotFoundError(`no real topic ${topicId}`);

  let topicState = null;
  try {
    topicState = await getTopicState(learnerId, topicId);
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }

  const [sampleQuestions, prerequisites] = await Promise.all([
    findApprovedQuestionsForTopic(topicId, 3),
    findPrerequisiteTopicsWithNames(topicId),
  ]);

  return {
    topicId,
    topicName: topic.name,
    mastery: topicState ? Math.round(topicState.mastery * 1000) / 1000 : 0,
    sampleQuestions: sampleQuestions.map((q) => ({ prompt: q.prompt, explanation: q.explanation })),
    prerequisites: prerequisites.map((p) => ({ topicId: p.id, topicName: p.name, strength: p.strength })),
  };
}

// Phase 30.1 — the real, deterministic pattern-detection context:
// composes getTopicState() (Phase 6), getEffectiveRetention() (Phase 24)
// and analyzeConfidenceIssues() (Phase 10) into detectTopicPatterns()'s
// real input shape — nothing here invents a signal.
export async function buildPatternContext(learnerId, topicId) {
  const topic = await findTopicById(topicId);
  if (!topic) throw new NotFoundError(`no real topic ${topicId}`);

  let topicState = null;
  try {
    topicState = await getTopicState(learnerId, topicId);
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }

  const recent = await findRecentAttemptsForTopic(learnerId, topicId, 20);
  const confidenceIssues = analyzeConfidenceIssues(recent.map((r) => ({ topicId, topicName: topic.name, correct: r.correct, confidence: r.confidence })));
  const confidenceIssue = confidenceIssues[0]?.issueType ?? null;

  let effectiveRetention = null;
  if (topicState && topicState.retention > 0) {
    const retentionResult = await getEffectiveRetention(learnerId, topicId).catch((err) => {
      if (err instanceof NotFoundError) return null;
      throw err;
    });
    effectiveRetention = retentionResult?.effective ?? null;
  }

  const signals = {
    accuracy: topicState?.accuracy ?? 0,
    speed: topicState?.speed ?? 0,
    misconceptionRisk: topicState?.misconceptionRisk ?? 0,
    prerequisiteRisk: topicState?.prerequisiteRisk ?? 0,
    storedRetention: topicState?.retention ?? 0,
    effectiveRetention,
    confidenceIssue,
  };

  return {
    topicId,
    topicName: topic.name,
    ...signals,
    patterns: detectTopicPatterns(signals).map((p) => p.reason),
  };
}

// Phase 30.3 — the real candidate set Phase 27's recommendation engine
// already scored, unchanged — AI only narrates which one won and why.
export async function buildRecommendationContext(learnerId) {
  const { recommendations, nextBestAction } = await getRecommendations(learnerId, { limit: 5 });
  return {
    topicId: nextBestAction?.target ?? null,
    topicName: nextBestAction?.target ?? 'no specific topic',
    topCandidate: nextBestAction,
    otherCandidates: recommendations.filter((r) => r.recommendationId !== nextBestAction?.recommendationId),
  };
}

export async function buildTopicPairContext(learnerId, topicIdA, topicIdB) {
  const [a, b] = await Promise.all([buildTopicContext(learnerId, topicIdA), buildTopicContext(learnerId, topicIdB)]);
  return { topicA: a, topicB: b };
}

export async function buildQuestionContext(learnerId, questionId, { selectedIndex = null } = {}) {
  const question = await findQuestionById(questionId);
  if (!question) throw new NotFoundError(`no real, published question ${questionId}`);

  const topicContext = await buildTopicContext(learnerId, question.topic_id);

  return {
    questionId: question.id,
    topicId: question.topic_id,
    topicName: topicContext.topicName,
    mastery: topicContext.mastery,
    prompt: question.prompt,
    options: question.options,
    correctAnswer: question.options[question.answer_index],
    selectedAnswer: selectedIndex === null || selectedIndex === undefined ? null : question.options[selectedIndex],
    isCorrect: selectedIndex === question.answer_index,
    explanation: question.explanation,
    trap: question.trap,
    prerequisites: topicContext.prerequisites,
  };
}
