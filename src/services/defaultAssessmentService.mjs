// Phase 3 — the Default Foundation Test: eligibility, blueprint generation,
// answer capture, and submission-time diagnosis. Every graded question still
// runs through src/lib/attempts.mjs's recordAttempt() (mode: 'ASSESSMENT'),
// exactly like the weekly test's submit route does with mode: 'TEST' — this
// is the "continuous testing" principle: a default assessment is not a
// separate scoring system, it's another source of evidence into the same
// learner model.
import crypto from 'node:crypto';
import { pool } from '../lib/db.mjs';
import { recordAttempt } from '../lib/attempts.mjs';
import { evaluateEligibility, buildWeightedDefaultAssessmentBlueprint, estimateAssessmentMinutes } from '../domain/defaultAssessment.mjs';
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
import { createAssessment, findAssessmentById } from '../repository/assessmentRepository.mjs';
import {
  findDefaultAssessmentCandidateTopics,
  findExposedTopicIds,
  findPublishedQuestionsForTopics,
  findSeenQuestionIds,
  findInProgressDefaultAssessment,
  insertAssessmentQuestions,
  findAssessmentQuestions,
  upsertAssessmentAnswer,
  findAssessmentAnswers,
  findPrerequisiteGraphForTopics,
  findTopicsInSyllabusOrder,
  findRetentionForTopics,
} from '../repository/defaultAssessmentRepository.mjs';
import { buildLearningPath } from '../domain/learningPath.mjs';
import { ValidationError, NotFoundError } from './errors.mjs';

export async function checkDefaultAssessmentEligibility(learnerId) {
  const candidateTopics = await findDefaultAssessmentCandidateTopics();
  const candidateTopicIds = candidateTopics.map((t) => t.id);
  const exposedTopicIds = await findExposedTopicIds(learnerId, candidateTopicIds);
  return evaluateEligibility({ candidateTopicIds, exposedTopicIds });
}

export async function startDefaultAssessment(learnerId) {
  const existing = await findInProgressDefaultAssessment(learnerId);
  if (existing) return getDefaultAssessment(existing.id);

  const eligibility = await checkDefaultAssessmentEligibility(learnerId);
  if (!eligibility.eligible) {
    throw new ValidationError([`not eligible for the default assessment yet: ${eligibility.reason}`]);
  }

  const candidateTopics = await findDefaultAssessmentCandidateTopics();
  const topicIds = candidateTopics.map((t) => t.id);
  const [questions, seenIds, graphRows] = await Promise.all([
    findPublishedQuestionsForTopics(topicIds),
    findSeenQuestionIds(learnerId),
    findPrerequisiteGraphForTopics(topicIds),
  ]);

  const questionsByTopic = new Map();
  for (const q of questions) {
    if (!questionsByTopic.has(q.topic_id)) questionsByTopic.set(q.topic_id, []);
    questionsByTopic.get(q.topic_id).push({ id: q.id, difficulty: q.difficulty, estimatedSeconds: q.estimated_seconds });
  }

  const topicPools = topicIds
    .map((topicId) => ({ topicId, questions: questionsByTopic.get(topicId) ?? [] }))
    .filter((p) => p.questions.length > 0);

  // Phase 9: the same total question budget as before (topicCount * 5), but
  // reallocated by prerequisite fan-out — a foundation topic many others
  // depend on gets more of the budget than a leaf topic (see
  // computePrerequisiteFanOut in defaultAssessment.mjs).
  const prerequisiteGraph = new Map();
  for (const edge of graphRows) {
    if (!prerequisiteGraph.has(edge.topic_id)) prerequisiteGraph.set(edge.topic_id, []);
    prerequisiteGraph.get(edge.topic_id).push({ id: edge.prerequisite_topic_id, strength: edge.strength });
  }

  const picked = buildWeightedDefaultAssessmentBlueprint(topicPools, new Set(seenIds), prerequisiteGraph);
  if (picked.length === 0) {
    throw new ValidationError(['no published questions are available for the foundation topics yet']);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO assessment (learner_id, type, status, question_count) VALUES ($1, 'DEFAULT_TEST', 'IN_PROGRESS', $2)
       RETURNING id`,
      [learnerId, picked.length]
    );
    const assessmentId = rows[0].id;
    await insertAssessmentQuestions(
      assessmentId,
      picked.map((p) => p.question.id),
      client
    );
    await client.query('COMMIT');
    return getDefaultAssessment(assessmentId);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function getDefaultAssessment(assessmentId) {
  const assessment = await findAssessmentById(assessmentId);
  if (!assessment || assessment.type !== 'DEFAULT_TEST') throw new NotFoundError(`no default assessment ${assessmentId}`);

  const [questions, answers] = await Promise.all([
    findAssessmentQuestions(assessmentId),
    findAssessmentAnswers(assessmentId),
  ]);
  const answerByQuestion = new Map(answers.map((a) => [a.question_id, a]));
  const revealAnswers = assessment.status === 'COMPLETED';

  return {
    assessmentId,
    status: assessment.status,
    questionCount: assessment.question_count,
    // Phase 9: "time" is one of the things the blueprint engine is asked to
    // consider — computed from each question's real estimated_seconds
    // rather than a flat per-question guess, and derived fresh here rather
    // than stored, since it's always recomputable from what's already fetched.
    estimatedMinutes: estimateAssessmentMinutes(questions.map((q) => ({ question: { estimatedSeconds: q.estimated_seconds } }))),
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

export async function saveDefaultAssessmentAnswer(assessmentId, { questionId, selectedIndex, timeTakenMs, confidence }) {
  if (!questionId) throw new ValidationError(['questionId is required']);

  const assessment = await findAssessmentById(assessmentId);
  if (!assessment || assessment.type !== 'DEFAULT_TEST') throw new NotFoundError(`no default assessment ${assessmentId}`);
  if (assessment.status !== 'IN_PROGRESS') {
    throw new ValidationError(['this assessment has already been submitted']);
  }

  await upsertAssessmentAnswer({
    assessmentId,
    questionId,
    selectedIndex: selectedIndex ?? null,
    timeTakenMs: timeTakenMs ?? null,
    confidence: confidence ?? null,
  });
}

export async function submitDefaultAssessment(assessmentId, learnerId) {
  const assessment = await findAssessmentById(assessmentId);
  if (!assessment || assessment.type !== 'DEFAULT_TEST') throw new NotFoundError(`no default assessment ${assessmentId}`);
  if (assessment.status !== 'IN_PROGRESS') {
    throw new ValidationError(['this assessment has already been submitted']);
  }

  const [questions, answers] = await Promise.all([
    findAssessmentQuestions(assessmentId),
    findAssessmentAnswers(assessmentId),
  ]);
  const answerByQuestion = new Map(answers.map((a) => [a.question_id, a]));

  const client = await pool.connect();
  let results;
  try {
    await client.query('BEGIN');
    results = [];
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
      prerequisiteGraph
        .get(row.topic_id)
        .push({ id: row.prerequisite_topic_id, strength: row.strength });
    }
    const gaps = diagnosePrerequisiteGaps(diagnosticBase.topics, prerequisiteGraph);
    // Phase 4: the sharper STRONG/WEAK/CRITICAL/PREREQUISITE_BLOCKED/UNKNOWN
    // read alongside the Phase 3 weak/strong split above — additive, not a
    // replacement, so nothing that already reads weakTopics/strongTopics
    // (including the Phase 3 smoke test) needs to change.
    const classifications = classifyTopics(diagnosticBase.topics, prerequisiteGraph);
    const recommendations = buildTopicRecommendations(classifications);

    // Phase 5: the same classifications, walked in real curriculum order
    // (not assessment presentation order, which is shuffled) rather than a
    // single next-action — this is the dynamic path, not just a verdict.
    const syllabusOrder = await findTopicsInSyllabusOrder(topicIds, client);
    const learningPath = buildLearningPath(syllabusOrder, classifications);

    // Phase 10: the Assessment Diagnostic Engine's three analyses nothing
    // else produces — speed, confidence, retention — plus strengths/
    // weaknesses reshaped to the exact output contract asked for. Retention
    // comes from the spaced-repetition pipeline's own tracked score
    // (revision.mjs, via recordAttempt, unchanged), read here, not
    // recomputed from this one assessment.
    const retentionRows = await findRetentionForTopics(learnerId, topicIds, client);
    const retentionByTopic = new Map(retentionRows.map((r) => [r.topic_id, r.retention]));

    const speedIssues = analyzeSpeedIssues(results);
    const confidenceIssues = analyzeConfidenceIssues(results);
    const retentionIssues = analyzeRetentionIssues(diagnosticBase.topics, retentionByTopic);
    const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(diagnosticBase.topics);

    const diagnostic = {
      ...diagnosticBase,
      ...gaps,
      classifications,
      recommendations,
      learningPath,
      // The literal output shape the Assessment Diagnostic Engine was asked
      // for, assembled from the analyses above plus the already-existing
      // prerequisiteGaps — nothing here is a second copy of that logic.
      report: {
        strengths,
        weaknesses,
        prerequisiteGaps: gaps.prerequisiteGaps,
        speedIssues,
        confidenceIssues,
        retentionIssues,
      },
    };

    await client.query(
      `UPDATE assessment
          SET status = 'COMPLETED', completed_at = now(), score = $1,
              metadata = metadata || jsonb_build_object('diagnostic', $2::jsonb)
        WHERE id = $3`,
      [diagnostic.overall.accuracy.toFixed(2), JSON.stringify(diagnostic), assessmentId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  return getDefaultAssessment(assessmentId);
}
