/**
 * The Default Foundation Test: eligibility and blueprint construction.
 *
 * Eligibility and question-set construction are kept here, pure, exactly
 * like testGen.mjs's weekly-test allocation — the service layer gathers the
 * DB rows, this module decides what they mean.
 */

import { pickTopicQuestions, allocateSlots } from './testGen.mjs';

export const FOUNDATION_QUESTIONS_PER_TOPIC = 5;

// A learner becomes eligible once she has some evidence of exposure (lesson
// completion, or — until lesson content exists at scale — at least one
// practice attempt) on most of the candidate topics, not all of them: a
// learner who has clearly moved past one or two foundation topics shouldn't
// be blocked from the diagnostic by a single untouched one.
export const MIN_EXPOSURE_FRACTION = 0.6;

/**
 * @param {object} input
 * @param {Array<string>} input.candidateTopicIds every topic the default test could draw from
 * @param {Array<string>} input.exposedTopicIds the subset with some evidence of being taught/practiced
 * @returns {{eligible: boolean, exposedCount: number, requiredCount: number, totalCount: number, reason: string}}
 */
export function evaluateEligibility({ candidateTopicIds, exposedTopicIds }) {
  const totalCount = candidateTopicIds.length;
  const exposedSet = new Set(exposedTopicIds);
  const exposedCount = candidateTopicIds.filter((id) => exposedSet.has(id)).length;
  const requiredCount = Math.max(1, Math.ceil(totalCount * MIN_EXPOSURE_FRACTION));
  const eligible = totalCount > 0 && exposedCount >= requiredCount;

  const reason = eligible
    ? `exposed to ${exposedCount}/${totalCount} foundation topics`
    : totalCount === 0
      ? 'no foundation topics are defined yet'
      : `only exposed to ${exposedCount}/${totalCount} foundation topics, needs ${requiredCount}`;

  return { eligible, exposedCount, requiredCount, totalCount, reason };
}

/**
 * Builds the question set for the default assessment: up to
 * FOUNDATION_QUESTIONS_PER_TOPIC questions per candidate topic, spread
 * across difficulty, unseen-first — reusing the same picker the weekly test
 * uses rather than a second selection algorithm.
 *
 * @param {Array<{topicId: string, questions: Array<{id: string, difficulty: number}>}>} topicPools
 * @param {Set<string>} seenIds
 * @param {number} perTopicCount
 * @returns {Array<{topicId: string, question: object}>}
 */
export function buildDefaultAssessmentBlueprint(topicPools, seenIds = new Set(), perTopicCount = FOUNDATION_QUESTIONS_PER_TOPIC) {
  const picked = [];
  for (const { topicId, questions } of topicPools) {
    const chosen = pickTopicQuestions(questions, perTopicCount, seenIds);
    for (const question of chosen) picked.push({ topicId, question });
  }
  return picked;
}

/**
 * How many *other* candidate topics list each topic as a prerequisite — a
 * topic many others depend on deserves more diagnostic signal than a leaf
 * topic, since a wrong read on it cascades through everything built on it
 * (exactly the chain classifyTopics()/buildLearningPath() already walk the
 * other direction, from a weak dependent back to its root cause).
 *
 * @param {Array<string>} topicIds the candidate set
 * @param {Map<string, Array<{id: string, strength: number}>>} prerequisiteGraph topic -> its prerequisites
 * @returns {Map<string, number>} topicId -> number of candidate topics depending on it
 */
export function computePrerequisiteFanOut(topicIds, prerequisiteGraph) {
  const fanOut = new Map(topicIds.map((id) => [id, 0]));
  for (const topicId of topicIds) {
    for (const edge of prerequisiteGraph.get(topicId) ?? []) {
      if (fanOut.has(edge.id)) fanOut.set(edge.id, fanOut.get(edge.id) + 1);
    }
  }
  return fanOut;
}

/**
 * The same total question budget as buildDefaultAssessmentBlueprint()
 * (topicCount * perTopicBaseline), but reallocated across topics by
 * prerequisite fan-out via the same largest-remainder apportionment the
 * weekly test already uses (allocateSlots, testGen.mjs, unchanged) — a
 * foundation topic with many dependents gets more questions; a leaf topic
 * gets fewer, never zero (every topic starts with a baseline share of 1).
 *
 * @param {Array<{topicId: string, questions: Array<{id: string, difficulty: number}>}>} topicPools
 * @param {Set<string>} seenIds
 * @param {Map<string, Array<{id: string, strength: number}>>} prerequisiteGraph
 * @param {number} perTopicBaseline same meaning as perTopicCount above — the budget is topicCount * this
 * @returns {Array<{topicId: string, question: object}>}
 */
export function buildWeightedDefaultAssessmentBlueprint(
  topicPools,
  seenIds = new Set(),
  prerequisiteGraph = new Map(),
  perTopicBaseline = FOUNDATION_QUESTIONS_PER_TOPIC
) {
  const topicIds = topicPools.map((p) => p.topicId);
  const fanOut = computePrerequisiteFanOut(topicIds, prerequisiteGraph);
  const totalBudget = topicIds.length * perTopicBaseline;

  const shares = topicIds.map((id) => ({ id, share: 1 + (fanOut.get(id) ?? 0) }));
  const slots = allocateSlots(shares, totalBudget);

  const picked = [];
  for (const { topicId, questions } of topicPools) {
    const count = slots.get(topicId) ?? perTopicBaseline;
    const chosen = pickTopicQuestions(questions, count, seenIds);
    for (const question of chosen) picked.push({ topicId, question });
  }
  return picked;
}

/**
 * The "time" the blueprint engine considers: the real estimated_seconds on
 * each selected question, summed — not a flat per-question guess — so the
 * estimate reflects what was actually picked.
 *
 * @param {Array<{question: {estimatedSeconds: number}}>} picked
 * @returns {number} whole minutes, rounded
 */
export function estimateAssessmentMinutes(picked) {
  const totalSeconds = picked.reduce((sum, p) => sum + (p.question.estimatedSeconds ?? 60), 0);
  return Math.round(totalSeconds / 60);
}
