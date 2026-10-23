/**
 * Phase 14 — Intervention Tracking.
 *
 * Every Adaptive Decision (adaptiveDecision.mjs, Phase 11, unchanged) is a
 * hypothesis: "reinforcing fractions will help her." This module doesn't
 * make that decision — it only computes whether the hypothesis held up,
 * from a baseline and a post snapshot the service layer gathers (both
 * already-computed mastery/retention values, Phase 6, never recomputed
 * here).
 */

import { InterventionVerdict } from './enums.mjs';

export const INTERVENTION_EFFECTIVENESS_CONFIG = {
  improvedGainFloor: 0.05, // learningGain at or above this counts as a real improvement
  regressedGainCeiling: -0.05, // learningGain at or below this counts as a real regression
};

/**
 * @param {object} input
 * @param {number} input.baselineScore mastery at the moment the intervention started
 * @param {number} input.postScore mastery at evaluation time
 * @param {number} input.baselineRetention retention at the moment the intervention started
 * @param {number} input.postRetention retention at evaluation time
 * @returns {{learningGain: number, retentionGain: number}}
 */
export function computeInterventionGains({ baselineScore, postScore, baselineRetention, postRetention }) {
  return {
    learningGain: Math.round((postScore - baselineScore) * 1000) / 1000,
    retentionGain: Math.round((postRetention - baselineRetention) * 1000) / 1000,
  };
}

/**
 * The question this whole phase exists to answer: did this recommendation
 * actually work?
 *
 * @param {{learningGain: number}} input
 * @returns {{verdict: string, reason: string}}
 */
export function assessInterventionEffectiveness({ learningGain }) {
  const cfg = INTERVENTION_EFFECTIVENESS_CONFIG;

  if (learningGain >= cfg.improvedGainFloor) {
    return { verdict: InterventionVerdict.IMPROVED, reason: `mastery rose by ${learningGain.toFixed(3)} since the intervention started` };
  }
  if (learningGain <= cfg.regressedGainCeiling) {
    return {
      verdict: InterventionVerdict.REGRESSED,
      reason: `mastery fell by ${Math.abs(learningGain).toFixed(3)} since the intervention started`,
    };
  }
  return { verdict: InterventionVerdict.NO_CHANGE, reason: `mastery barely moved (${learningGain.toFixed(3)}) since the intervention started` };
}

/**
 * Phase 27.6 — "the system learns that this intervention was effective":
 * an aggregate across every evaluated intervention, not just one. Reuses
 * assessInterventionEffectiveness() per row rather than re-deriving a
 * verdict — this only counts and groups what that function already decides.
 *
 * @param {Array<{status: string, learningGain: number|null, interventionType: string}>} interventions
 */
export function summarizeInterventionEffectiveness(interventions) {
  const evaluated = interventions.filter((i) => i.status === 'EVALUATED' && i.learningGain !== null);

  const counts = { IMPROVED: 0, NO_CHANGE: 0, REGRESSED: 0 };
  const byType = new Map();
  for (const i of evaluated) {
    const { verdict } = assessInterventionEffectiveness({ learningGain: i.learningGain });
    counts[verdict] += 1;
    if (!byType.has(i.interventionType)) byType.set(i.interventionType, { IMPROVED: 0, NO_CHANGE: 0, REGRESSED: 0, count: 0 });
    const t = byType.get(i.interventionType);
    t[verdict] += 1;
    t.count += 1;
  }

  const averageLearningGain =
    evaluated.length > 0 ? Math.round((evaluated.reduce((s, i) => s + i.learningGain, 0) / evaluated.length) * 1000) / 1000 : null;

  return {
    totalEvaluated: evaluated.length,
    totalPending: interventions.length - evaluated.length,
    counts,
    averageLearningGain,
    byType: Object.fromEntries(byType),
  };
}

/**
 * Phase 30.2 — "AI learns which teaching intervention works best [for this
 * concept]": the same real, evaluated history, grouped by topic first,
 * then by intervention type within it — "for THIS topic, which real
 * intervention type produced the best average gain so far." Still just
 * counting and averaging what assessInterventionEffectiveness() already
 * decided — no new judgment, no invented "visual vs text" axis this
 * system has never tracked.
 *
 * @param {Array<{status: string, learningGain: number|null, interventionType: string, topicId: string}>} interventions
 */
export function summarizeInterventionEffectivenessByTopic(interventions) {
  const evaluated = interventions.filter((i) => i.status === 'EVALUATED' && i.learningGain !== null);

  const byTopic = new Map();
  for (const i of evaluated) {
    if (!byTopic.has(i.topicId)) byTopic.set(i.topicId, new Map());
    const byType = byTopic.get(i.topicId);
    if (!byType.has(i.interventionType)) byType.set(i.interventionType, { count: 0, totalGain: 0 });
    const t = byType.get(i.interventionType);
    t.count += 1;
    t.totalGain += i.learningGain;
  }

  const result = {};
  for (const [topicId, byType] of byTopic) {
    const types = [...byType.entries()].map(([interventionType, { count, totalGain }]) => ({
      interventionType,
      count,
      averageGain: Math.round((totalGain / count) * 1000) / 1000,
    }));
    types.sort((a, b) => b.averageGain - a.averageGain);
    result[topicId] = { types, mostEffective: types[0]?.interventionType ?? null };
  }
  return result;
}
