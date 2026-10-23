// Phase 27.1/27.2/27.3 — AdaptiveTestService. Reuses the generic
// `assessment` schema (V6/V7, Phase 2/3) with a new 'ADAPTIVE_TEST' type —
// createAssessment/findAssessmentById/insertAssessmentQuestions/
// findAssessmentQuestions/upsertAssessmentAnswer/findAssessmentAnswers are
// all already generic over assessment_id and type, unchanged. The
// blueprint (27.1) and question scoring (27.2) are new; question candidate
// pools per category reuse Phase 3/4/11/21/26's own repositories/services.
import crypto from 'node:crypto';
import { pool } from '../lib/db.mjs';
import { recordAttempt } from '../lib/attempts.mjs';
import { buildAdaptiveTestBlueprint } from '../domain/adaptiveTestBlueprint.mjs';
import { selectBestQuestion } from '../domain/questionSelectionScore.mjs';
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
import { buildCognitiveProblems, buildRetentionProblems } from '../domain/testDiagnostics.mjs';
import { buildLearningPath } from '../domain/learningPath.mjs';
import { createAssessment, findAssessmentById } from '../repository/assessmentRepository.mjs';
import {
  findDefaultAssessmentCandidateTopics,
  findPublishedQuestionsForTopics,
  insertAssessmentQuestions,
  findAssessmentQuestions,
  upsertAssessmentAnswer,
  findAssessmentAnswers,
  findPrerequisiteGraphForTopics,
  findTopicsInSyllabusOrder,
  findRetentionForTopics,
} from '../repository/defaultAssessmentRepository.mjs';
import { findDueRevisionTopic } from '../repository/weeklyPlanRepository.mjs';
import { findUntouchedTopicsWithQuestions, findQuestionAttemptStats, findLatestOtherCompletedAssessmentDiagnostic } from '../repository/adaptiveTestRepository.mjs';
import { getLearnerSummary, getTopicState } from './learnerStateService.mjs';
import { getPyqTopics, listPyqQuestions } from './pyqCatalogService.mjs';
import { listInspiredQuestions } from './inspiredQuestionService.mjs';
import { isRevisionDue } from '../repository/adaptiveDecisionRepository.mjs';
import { getEffectiveRetention } from './retentionEngineService.mjs';
import { NotFoundError, ValidationError } from './errors.mjs';

const DIFFICULTY_TARGETS = { EASY: 0.2, MEDIUM: 0.5, HARD: 0.75, EXPERT: 0.9 };
const WEAK_CLASSIFICATIONS = new Set(['WEAK', 'CRITICAL', 'PREREQUISITE_BLOCKED']);

async function buildTopicContext(learnerId, topicId, cache) {
  if (cache.has(topicId)) return cache.get(topicId);

  let topicState = null;
  try {
    topicState = await getTopicState(learnerId, topicId);
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }

  const revisionDue = topicState ? await isRevisionDue(learnerId, topicId) : false;
  let effectiveRetention = null;
  if (topicState && topicState.retention > 0) {
    const retentionResult = await getEffectiveRetention(learnerId, topicId).catch((err) => {
      if (err instanceof NotFoundError) return null;
      throw err;
    });
    effectiveRetention = retentionResult?.effective ?? null;
  }

  const context = {
    topicNeed: topicState ? 1 - topicState.accuracy : 0.6,
    misconceptionRelevance: topicState?.misconceptionRisk ?? 0,
    prerequisiteRelevance: topicState?.prerequisiteRisk ?? 0,
    revisionUrgency: revisionDue ? 1 : effectiveRetention !== null ? 1 - effectiveRetention : 0,
  };
  cache.set(topicId, context);
  return context;
}

// Splits a category's question quota across the blueprint's difficulty
// bands proportionally, picking the single best-scoring, not-yet-used
// candidate for each slot — scoreQuestionCandidate (27.2) decides which.
// Each candidate may belong to a different topic, so every candidate is
// scored against its own topic's real context (cached per topic, not
// re-fetched per question).
async function pickQuestionsForCategory(learnerId, category, pool, quota, difficultyDistribution, topicContextCache, usedIds) {
  if (quota <= 0 || pool.length === 0) return [];

  const bands = Object.entries(difficultyDistribution).filter(([, share]) => share > 0);
  const picks = [];
  let allocated = 0;
  for (const [i, [band, share]] of bands.entries()) {
    const bandQuota = i === bands.length - 1 ? quota - allocated : Math.round(share * quota);
    allocated += bandQuota;
    for (let n = 0; n < bandQuota; n += 1) {
      const available = pool.filter((q) => !usedIds.has(q.id));
      if (available.length === 0) break;

      let best = null;
      for (const candidate of available) {
        const topicId = candidate.topic_id ?? candidate.topicId;
        const topicContext = await buildTopicContext(learnerId, topicId, topicContextCache);
        const scored = selectBestQuestion([candidate], { targetDifficulty: DIFFICULTY_TARGETS[band], ...topicContext });
        if (scored && (!best || scored.score > best.score)) best = scored;
      }
      if (!best) break;
      usedIds.add(best.id);
      picks.push({ ...best, category });
    }
  }
  return picks;
}

async function gatherBlueprintEvidence(learnerId) {
  const [summary, revision, pyqTopics, inspired] = await Promise.all([
    getLearnerSummary(learnerId),
    findDueRevisionTopic(learnerId),
    getPyqTopics(),
    listInspiredQuestions(),
  ]);
  return {
    summary,
    revision,
    hasRevisionDue: revision.dueCount > 0,
    hasPyqContent: pyqTopics.length > 0,
    hasInspiredContent: inspired.questions.length > 0,
  };
}

export async function createAdaptiveTest(learnerId, { questionCount } = {}) {
  const { summary, revision, hasRevisionDue, hasPyqContent, hasInspiredContent } = await gatherBlueprintEvidence(learnerId);

  const blueprint = buildAdaptiveTestBlueprint({
    averageMastery: summary.averageMastery,
    hasRevisionDue,
    hasPyqContent,
    hasInspiredContent,
    questionCount,
  });

  const foundationTopics = (await findDefaultAssessmentCandidateTopics()).map((t) => t.id);
  const weakTopicIds = summary.classifications.filter((c) => WEAK_CLASSIFICATIONS.has(c.classification)).map((c) => c.topicId);
  const revisionTopicIds = revision.topic ? [revision.topic.topicId] : [];
  const coveredTopicIds = [...new Set([...foundationTopics, ...weakTopicIds, ...revisionTopicIds])];
  const newConceptTopicIds = await findUntouchedTopicsWithQuestions(learnerId, coveredTopicIds);

  const [foundationPool, weakPool, revisionPool, pyqResult, inspiredResult, newConceptPool] = await Promise.all([
    findPublishedQuestionsForTopics(foundationTopics),
    findPublishedQuestionsForTopics(weakTopicIds),
    findPublishedQuestionsForTopics(revisionTopicIds),
    listPyqQuestions(learnerId, { limit: 200 }),
    listInspiredQuestions(),
    findPublishedQuestionsForTopics(newConceptTopicIds),
  ]);

  const pools = {
    FOUNDATION: foundationPool,
    WEAK_AREAS: weakPool,
    REVISION: revisionPool,
    ACTUAL_PYQ: pyqResult.questions,
    INSPIRED_MCQ: inspiredResult.questions,
    NEW_CONCEPTS: newConceptPool,
  };

  // Real seenCount/attemptsSinceLastSeen per candidate — novelty() (27.2,
  // reused from selection.mjs) needs real history, not a silent default.
  const allCandidateIds = Object.values(pools).flatMap((p) => p.map((q) => q.id));
  const attemptStats = await findQuestionAttemptStats(learnerId, allCandidateIds);
  for (const list of Object.values(pools)) {
    for (const q of list) {
      const stats = attemptStats.get(q.id);
      q.seenCount = stats?.seenCount ?? 0;
      q.attemptsSinceLastSeen = stats?.attemptsSinceLastSeen ?? 999;
    }
  }

  const usedIds = new Set();
  const topicContextCache = new Map();
  let picked = [];
  for (const category of Object.keys(blueprint.categoryQuestionCounts)) {
    const categoryPicks = await pickQuestionsForCategory(
      learnerId,
      category,
      pools[category],
      blueprint.categoryQuestionCounts[category],
      blueprint.difficultyDistribution,
      topicContextCache,
      usedIds
    );
    picked = picked.concat(categoryPicks);
  }

  if (picked.length === 0) {
    throw new ValidationError(['no real published questions are available yet to build an adaptive test']);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const assessment = await createAssessment(
      { learnerId, type: 'ADAPTIVE_TEST', status: 'DRAFT', metadata: { blueprint, selectionBreakdown: picked.map((p) => ({ questionId: p.id, category: p.category, score: p.score, breakdown: p.breakdown })) } },
      client
    );
    await client.query('UPDATE assessment SET question_count = $1 WHERE id = $2', [picked.length, assessment.id]);
    await insertAssessmentQuestions(assessment.id, picked.map((p) => p.id), client);
    await client.query('COMMIT');
    return getAdaptiveTest(assessment.id);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function loadAdaptiveTestAssessment(id) {
  const assessment = await findAssessmentById(id);
  if (!assessment || assessment.type !== 'ADAPTIVE_TEST') throw new NotFoundError(`no adaptive test ${id}`);
  return assessment;
}

export async function startAdaptiveTest(id) {
  const assessment = await loadAdaptiveTestAssessment(id);
  if (assessment.status === 'DRAFT') {
    await pool.query(
      `UPDATE assessment SET status = 'IN_PROGRESS', metadata = metadata || jsonb_build_object('startedAt', now()) WHERE id = $1`,
      [id]
    );
  }
  return getAdaptiveTest(id);
}

export async function getAdaptiveTest(id) {
  const assessment = await loadAdaptiveTestAssessment(id);
  const [questions, answers] = await Promise.all([findAssessmentQuestions(id), findAssessmentAnswers(id)]);
  const answerByQuestion = new Map(answers.map((a) => [a.question_id, a]));
  const revealAnswers = assessment.status === 'COMPLETED';

  return {
    testId: id,
    status: assessment.status,
    questionCount: assessment.question_count,
    blueprint: assessment.metadata?.blueprint ?? null,
    score: assessment.score === null || assessment.score === undefined ? null : Number(assessment.score),
    diagnostic: revealAnswers ? (assessment.metadata?.diagnostic ?? null) : null,
    questions: questions.map((q) => {
      const answer = answerByQuestion.get(q.question_id);
      return {
        questionId: q.question_id,
        topicId: q.topic_id,
        topicName: q.topic_name,
        prompt: q.prompt,
        options: q.options,
        difficulty: q.difficulty,
        estimatedSeconds: q.estimated_seconds,
        selectedIndex: answer?.selected_index ?? null,
        confidence: answer?.confidence ?? null,
        ...(revealAnswers ? { correctIndex: q.answer_index, explanation: q.explanation, trap: q.trap } : {}),
      };
    }),
  };
}

export async function saveAdaptiveTestAnswer(id, { questionId, selectedIndex, timeTakenMs, confidence }) {
  if (!questionId) throw new ValidationError(['questionId is required']);
  const assessment = await loadAdaptiveTestAssessment(id);
  if (assessment.status !== 'IN_PROGRESS') throw new ValidationError(['this test is not in progress']);

  await upsertAssessmentAnswer({ assessmentId: id, questionId, selectedIndex: selectedIndex ?? null, timeTakenMs: timeTakenMs ?? null, confidence: confidence ?? null });
}

export async function submitAdaptiveTest(id, learnerId) {
  const assessment = await loadAdaptiveTestAssessment(id);
  if (assessment.status !== 'IN_PROGRESS') throw new ValidationError(['this test is not in progress']);

  const [questions, answers] = await Promise.all([findAssessmentQuestions(id), findAssessmentAnswers(id)]);
  const answerByQuestion = new Map(answers.map((a) => [a.question_id, a]));

  const client = await pool.connect();
  let diagnostic;
  try {
    await client.query('BEGIN');
    const results = [];
    for (const q of questions) {
      const answer = answerByQuestion.get(q.question_id);
      const answered = answer && answer.selected_index !== null && answer.selected_index !== undefined;
      let graded = { correct: false, mistakeType: null };
      if (answered) {
        graded = await recordAttempt({
          client,
          learnerId,
          questionId: q.question_id,
          attemptId: crypto.randomUUID(),
          selectedIndex: answer.selected_index,
          timeTakenMs: answer.time_taken_ms ?? 0,
          confidence: answer.confidence ?? null,
          mode: 'ASSESSMENT',
        });
      }
      results.push({
        topicId: q.topic_id,
        topicName: q.topic_name,
        difficulty: q.difficulty,
        estimatedSeconds: q.estimated_seconds,
        correct: graded.correct,
        timeTakenMs: answer?.time_taken_ms ?? null,
        confidence: answer?.confidence ?? null,
        mistakeType: graded.mistakeType,
      });
    }

    const diagnosticBase = summarizeByTopic(results);
    const topicIds = diagnosticBase.topics.map((t) => t.topicId);
    const graphRows = await findPrerequisiteGraphForTopics(topicIds, client);
    const prerequisiteGraph = new Map();
    for (const row of graphRows) {
      if (!prerequisiteGraph.has(row.topic_id)) prerequisiteGraph.set(row.topic_id, []);
      prerequisiteGraph.get(row.topic_id).push({ id: row.prerequisite_topic_id, strength: row.strength });
    }
    const gaps = diagnosePrerequisiteGaps(diagnosticBase.topics, prerequisiteGraph);
    const classifications = classifyTopics(diagnosticBase.topics, prerequisiteGraph);
    const recommendations = buildTopicRecommendations(classifications);
    const syllabusOrder = await findTopicsInSyllabusOrder(topicIds, client);
    const learningPath = buildLearningPath(syllabusOrder, classifications);

    const retentionRows = await findRetentionForTopics(learnerId, topicIds, client);
    const retentionByTopic = new Map(retentionRows.map((r) => [r.topic_id, r.retention]));
    const speedIssues = analyzeSpeedIssues(results);
    const confidenceIssues = analyzeConfidenceIssues(results);
    const retentionIssues = analyzeRetentionIssues(diagnosticBase.topics, retentionByTopic);
    const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(diagnosticBase.topics);

    // 27.4's two genuinely new pieces: real cognitive-problem aggregation,
    // and a real previous-test comparison for retention-decay detection.
    const cognitiveProblems = buildCognitiveProblems(results, confidenceIssues, speedIssues);
    const previousDiagnostic = await findLatestOtherCompletedAssessmentDiagnostic(learnerId, id, client);
    const previousTopicsByTopicId = new Map((previousDiagnostic?.topics ?? []).map((t) => [t.topicId, t]));
    const retentionProblems = buildRetentionProblems(diagnosticBase.topics, previousTopicsByTopicId);

    diagnostic = {
      ...diagnosticBase,
      ...gaps,
      classifications,
      recommendations,
      learningPath,
      report: { strengths, weaknesses, prerequisiteGaps: gaps.prerequisiteGaps, speedIssues, confidenceIssues, retentionIssues },
      cognitiveProblems,
      retentionProblems,
    };

    await client.query(
      `UPDATE assessment
          SET status = 'COMPLETED', completed_at = now(), score = $1,
              metadata = metadata || jsonb_build_object('diagnostic', $2::jsonb)
        WHERE id = $3`,
      [diagnosticBase.overall.accuracy.toFixed(2), JSON.stringify(diagnostic), id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  return getAdaptiveTest(id);
}

export async function getAdaptiveTestAnalysis(id) {
  const result = await getAdaptiveTest(id);
  if (result.status !== 'COMPLETED') throw new ValidationError(['this test has not been submitted yet']);
  return result.diagnostic;
}
