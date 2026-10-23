// Phase 29.4/29.5 — AITutorService: the one dispatch point for all ten
// AI Tutor capabilities, implementing the brief's own pipeline exactly —
// Context Builder -> Prompt Template -> AI Model -> (validate) ->
// Structured Response -> Logger. Every task tries the real provider first
// (same contract as the existing POST /api/ai/hint) and falls back to a
// real, grounded, deterministic response — never a raw error, never
// fabricated text either way.
import { AITaskType, AI_TASK_SCOPE } from '../domain/enums.mjs';
import { buildPromptForTask } from '../domain/ai/promptTemplates.mjs';
import { validateAiResponse } from '../domain/ai/responseValidator.mjs';
import { buildDeterministicFallback } from '../domain/ai/deterministicFallback.mjs';
import { buildTopicContext, buildTopicPairContext, buildQuestionContext, buildPatternContext, buildRecommendationContext } from './aiContextBuilderService.mjs';
import { callAiModel } from './aiModelProviderService.mjs';
import { findCachedResponse, insertAiInteraction } from '../repository/aiInteractionRepository.mjs';
import { findSimilarQuestion } from '../repository/pyqCatalogRepository.mjs';
import { listInterventions } from './interventionService.mjs';
import { ValidationError } from './errors.mjs';

async function resolveContext(learnerId, task, { topicId, questionId, secondTopicId, selectedIndex }) {
  // Phase 30: two tasks need a different, richer context than plain
  // buildTopicContext() — handled before the generic scope dispatch below.
  if (task === AITaskType.INTERPRET_PATTERNS) {
    if (!topicId) throw new ValidationError([`${task} requires a real topicId`]);
    const context = await buildPatternContext(learnerId, topicId);
    // Real patterns change as new real evidence comes in — unlike a
    // static topic fact (TEACH_PREREQUISITE), caching this would mean
    // every later call keeps reporting whatever was true the first time
    // it was asked. Always computed fresh; still logged (best-effort —
    // ON CONFLICT DO NOTHING means a same-topic repeat may not get a new
    // log row, which is an acceptable gap, not a wrong answer).
    return { context, cacheTopicId: context.topicId, cacheQuestionId: null, noCache: true };
  }
  if (task === AITaskType.EXPLAIN_RECOMMENDATION) {
    const context = await buildRecommendationContext(learnerId);
    // Same reasoning — real recommendations change as real evidence
    // changes — plus the top recommendation may have no target topic at
    // all (e.g. the WEEKLY_TEST fallback), which ai_interaction's real,
    // required topic_id has no slot for either way.
    return { context, cacheTopicId: context.topicId, cacheQuestionId: null, noCache: true };
  }

  const scope = AI_TASK_SCOPE[task];
  if (scope === 'QUESTION') {
    if (!questionId) throw new ValidationError([`${task} requires a real questionId`]);
    const context = await buildQuestionContext(learnerId, questionId, { selectedIndex });
    if (task === AITaskType.SIMILAR_QUESTION) {
      context.similarQuestion = await findSimilarQuestion(context.topicId, 0.5, context.questionId);
    }
    return { context, cacheTopicId: context.topicId, cacheQuestionId: context.questionId };
  }
  if (scope === 'TOPIC') {
    if (!topicId) throw new ValidationError([`${task} requires a real topicId`]);
    const context = await buildTopicContext(learnerId, topicId);
    return { context, cacheTopicId: context.topicId, cacheQuestionId: null };
  }
  if (scope === 'TOPIC_PAIR') {
    if (!topicId || !secondTopicId) throw new ValidationError([`${task} requires both topicId and secondTopicId`]);
    const context = await buildTopicPairContext(learnerId, topicId, secondTopicId);
    // ai_interaction.question_id carries no slot for a second topic, and
    // its FK requires a real question id — so this scope is never cached
    // or read from cache (noCache below), only ever computed fresh and
    // best-effort logged, to avoid returning a stale comparison against
    // the wrong second topic.
    return { context: { ...context, pairKey: `${topicId}:${secondTopicId}` }, cacheTopicId: topicId, cacheQuestionId: null, noCache: true };
  }
  throw new ValidationError([`unknown AI task ${task}`]);
}

export async function getAiTutorResponse(learnerId, task, params = {}) {
  if (!Object.values(AITaskType).includes(task)) throw new ValidationError([`unknown AI task ${task}`]);

  const { context, cacheTopicId, cacheQuestionId, noCache } = await resolveContext(learnerId, task, params);

  if (!noCache) {
    const cached = await findCachedResponse({ learnerId, topicId: cacheTopicId, type: task, questionId: cacheQuestionId });
    if (cached) {
      return { task, topicId: cacheTopicId, questionId: cacheQuestionId, source: 'cache', text: cached.response, model: cached.model };
    }
  }

  const prompt = buildPromptForTask(task, context);
  const modelResult = await callAiModel(prompt);

  let text;
  let source;
  let model;
  if (modelResult && validateAiResponse(modelResult.text).valid) {
    text = modelResult.text;
    source = 'model';
    model = modelResult.model;
  } else {
    text = buildDeterministicFallback(task, context);
    source = 'fallback';
    model = 'deterministic-v1';
  }

  // Link to a real, currently-active Phase 14 intervention on this topic,
  // if one exists — the thread 29.7's feedback loop later pulls on.
  // Nothing is logged when there is no real topic to key it on
  // (ai_interaction.topic_id is required) — a real response is still
  // returned, just not cached or linked to an intervention.
  if (cacheTopicId) {
    const interventions = await listInterventions(learnerId);
    const activeIntervention = interventions.find((i) => i.topicId === cacheTopicId && i.status === 'ACTIVE');

    await insertAiInteraction({
      learnerId,
      topicId: cacheTopicId,
      questionId: cacheQuestionId,
      type: task,
      promptContext: context,
      response: text,
      model,
      interventionId: activeIntervention?.id ?? null,
    });
  }

  return { task, topicId: cacheTopicId, questionId: cacheQuestionId, source, text, model };
}
