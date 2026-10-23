/**
 * Phase 28.3 — Exam Readiness Engine. A weighted composite over real,
 * already-computed signals (mastery, PYQ performance, mock-test
 * performance, recent trend, retention, speed, confidence calibration,
 * subject coverage, consistency) — explicitly not a pass probability, the
 * brief's own stated constraint, carried in every response.
 */

import { clamp01 } from './accuracy.mjs';

export const EXAM_READINESS_DISCLAIMER = 'This is a readiness index, not a guaranteed pass probability.';

// Initial values — reasonable starting weights, not yet tuned against real
// outcomes, same caveat as every scoring module since Phase 11.
export const EXAM_READINESS_WEIGHTS = {
  mastery: 0.25,
  pyqPerformance: 0.15,
  mockTestPerformance: 0.15,
  recentTrend: 0.1,
  retention: 0.1,
  speed: 0.1,
  confidenceCalibration: 0.1,
  subjectCoverage: 0.025,
  consistency: 0.025,
};

export const READINESS_LABELS = [
  { floor: 85, label: 'STRONG' },
  { floor: 70, label: 'GOOD' },
  { floor: 50, label: 'DEVELOPING' },
  { floor: 0, label: 'NEEDS_WORK' },
];

export function readinessLabel(score) {
  return READINESS_LABELS.find((b) => score >= b.floor).label;
}

/**
 * @param {Record<keyof EXAM_READINESS_WEIGHTS, number>} signals every value 0..1
 * @returns {{overall: number, label: string, breakdown: object}}
 */
export function computeExamReadinessIndex(signals) {
  const breakdown = {};
  let total = 0;
  for (const [key, weight] of Object.entries(EXAM_READINESS_WEIGHTS)) {
    const value = clamp01(signals[key] ?? 0);
    breakdown[key] = Math.round(value * 100);
    total += weight * value;
  }
  const overall = Math.round(total * 100 * 100) / 100;
  return { overall, label: readinessLabel(overall), breakdown };
}

const CHANGE_NOISE_FLOOR = 2; // a breakdown component move smaller than this (score points) isn't worth naming

/**
 * "The system should also explain why the score changed." Diffs the
 * current breakdown against a real previous snapshot — never fabricates a
 * reason when there is nothing to compare against.
 *
 * @param {{overall: number, breakdown: object}} current
 * @param {{overall: number, breakdown: object}|null} previous
 */
export function explainReadinessChange(current, previous) {
  if (!previous) {
    return { changed: null, delta: null, explanation: 'first readiness computation — no prior snapshot to compare against' };
  }

  const delta = Math.round((current.overall - previous.overall) * 100) / 100;
  const moves = Object.keys(current.breakdown)
    .map((key) => ({ key, delta: current.breakdown[key] - (previous.breakdown[key] ?? 0) }))
    .filter((m) => Math.abs(m.delta) >= CHANGE_NOISE_FLOOR)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  if (moves.length === 0) {
    return { changed: delta !== 0, delta, explanation: 'no individual component moved enough to explain it — a broad, small shift across the board' };
  }

  const direction = delta >= 0 ? 'increased' : 'decreased';
  const parts = moves.map((m) => `${m.key} ${m.delta >= 0 ? 'improved' : 'dropped'}`);
  return {
    changed: delta !== 0,
    delta,
    explanation: `Readiness ${direction} because ${parts.join(', ')}.`,
  };
}
