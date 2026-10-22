/**
 * Question and topic selection.
 *
 * Both are weighted scores over candidates rather than "SELECT ... ORDER BY
 * random()". Every term is a number between 0 and 1 so the weights mean what
 * they look like they mean.
 */

import { clamp01 } from './accuracy.mjs';

// ------------------------------------------------------------------ questions

export const QUESTION_WEIGHTS = {
  difficultyFit: 0.45,
  novelty: 0.35,
  examRelevance: 0.2,
};

/**
 * How well a question's difficulty matches where the learner is. Peaks at an
 * exact match and falls off smoothly; a question 0.3 away scores near zero.
 */
export function difficultyFit(questionDifficulty, targetDifficulty) {
  const delta = Math.abs(questionDifficulty - targetDifficulty);
  return clamp01(1 - (delta / 0.3) ** 2);
}

/**
 * Unseen questions score 1. A question seen once recently is heavily penalised;
 * the penalty decays so an old question can come round again, which is what
 * makes it useful for revision rather than banned forever.
 */
export function novelty(seenCount, attemptsSinceLastSeen) {
  if (!seenCount) return 1;
  const recency = clamp01(attemptsSinceLastSeen / 40);
  const repetition = 1 / (1 + seenCount);
  return clamp01(recency * 0.7 + repetition * 0.3);
}

/**
 * A question from a real past paper is worth more than one authored on a
 * Tuesday, because it is evidence about how the examiner asks.
 */
export function examRelevance(source) {
  if (typeof source === 'string' && source.startsWith('tnpsc-')) return 1;
  if (source === 'textbook') return 0.6;
  return 0.4;
}

/**
 * @param {Array<object>} candidates questions with {id, difficulty, source, seenCount, attemptsSinceLastSeen}
 * @param {number} targetDifficulty
 * @returns {object|null} the highest scoring candidate, with `score` attached
 */
export function selectQuestion(candidates, targetDifficulty) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  let best = null;
  for (const question of candidates) {
    const score =
      QUESTION_WEIGHTS.difficultyFit * difficultyFit(question.difficulty, targetDifficulty) +
      QUESTION_WEIGHTS.novelty *
        novelty(question.seenCount ?? 0, question.attemptsSinceLastSeen ?? 0) +
      QUESTION_WEIGHTS.examRelevance * examRelevance(question.source);

    if (!best || score > best.score) best = { ...question, score };
  }
  return best;
}

// --------------------------------------------------------------------- topics

export const TOPIC_WEIGHTS = {
  weakness: 0.35,
  examWeight: 0.35,
  prerequisiteUrgency: 0.2,
  momentum: 0.1,
};

/**
 * Exam weight straight from the syllabus: this chapter's share of the paper,
 * divided across its topics. Not invented, not tuned.
 *
 * @param {number} chapterQuestionCount official count for the unit
 * @param {number} topicsInChapter
 * @param {number} maxChapterQuestionCount largest count in the paper, for scaling
 */
export function examWeight(chapterQuestionCount, topicsInChapter, maxChapterQuestionCount) {
  if (!chapterQuestionCount || !topicsInChapter) return 0;
  const perTopic = chapterQuestionCount / topicsInChapter;
  const maxPerTopic = maxChapterQuestionCount || 1;
  return clamp01(perTopic / maxPerTopic);
}

/**
 * @param {Array<object>} topics with {id, accuracy, examWeight, prerequisiteGap, attemptCount}
 * @returns {object|null}
 */
export function selectTopic(topics) {
  if (!Array.isArray(topics) || topics.length === 0) return null;

  let best = null;
  for (const topic of topics) {
    // An untouched topic is not "weak" — it is unknown. Treat it as moderately
    // needy so the engine explores rather than grinding one topic forever.
    const weakness = topic.attemptCount === 0 ? 0.6 : 1 - clamp01(topic.accuracy);

    // Momentum: a topic she is partway through is worth finishing.
    const momentum = topic.attemptCount > 0 && topic.attemptCount < 20 ? 1 : 0.3;

    const score =
      TOPIC_WEIGHTS.weakness * weakness +
      TOPIC_WEIGHTS.examWeight * clamp01(topic.examWeight) +
      TOPIC_WEIGHTS.prerequisiteUrgency * clamp01(topic.prerequisiteGap ?? 0) +
      TOPIC_WEIGHTS.momentum * momentum;

    if (!best || score > best.score) best = { ...topic, score };
  }
  return best;
}

/**
 * Walk the prerequisite graph backwards from a topic she is failing and return
 * the weakest thing it rests on. This is the difference between "you got
 * percentages wrong again" and "your fractions are the problem".
 *
 * @param {string} topicId
 * @param {Map<string, Array<{id: string, strength: number}>>} graph topic -> prerequisites
 * @param {Map<string, number>} accuracyByTopic
 * @returns {{topicId: string, accuracy: number}|null}
 */
export function weakestPrerequisite(topicId, graph, accuracyByTopic) {
  const seen = new Set([topicId]);
  const queue = [...(graph.get(topicId) ?? [])];
  let weakest = null;

  while (queue.length > 0) {
    const edge = queue.shift();
    if (seen.has(edge.id)) continue;
    seen.add(edge.id);

    const accuracy = accuracyByTopic.get(edge.id);
    // An unattempted prerequisite is the most urgent thing there is.
    const effective = accuracy === undefined ? 0 : accuracy;

    if (effective < 0.7 && (!weakest || effective < weakest.accuracy)) {
      weakest = { topicId: edge.id, accuracy: effective };
    }

    for (const next of graph.get(edge.id) ?? []) queue.push(next);
  }

  return weakest;
}
