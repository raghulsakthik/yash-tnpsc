/**
 * Phase 15 — Test-to-Test Intelligence: the LearningGainCalculator.
 *
 * Compares the SAME topic's stored diagnostic (summarizeByTopic()'s output,
 * Phase 3/10, unchanged) between two completed assessments. Nothing here
 * reclassifies a single attempt or recomputes a topic's accuracy — it only
 * diffs two already-computed snapshots, which is the entire point: did the
 * numbers actually move between test 1 and test 2?
 */

export const TEST_COMPARISON_CONFIG = {
  masteryAccuracyFloor: 80, // test 2 accuracy at/above this, with a real gain, means the goal is reached
  meaningfulGainFloor: 15, // a gain at/above this percentage-point threshold is substantive, not noise
  regressionCeiling: -5, // a drop at/below this is a real regression, not noise
};

/**
 * @param {object} test1Topic one entry from an earlier completed assessment's diagnostic.topics
 * @param {object} test2Topic the same topicId from a later completed assessment's diagnostic.topics
 * @returns {object} topic/accuracy/speed/confidence/mistake/difficulty deltas between the two
 */
export function compareTopicAcrossTests(test1Topic, test2Topic) {
  const accuracyGain = Math.round((test2Topic.accuracy - test1Topic.accuracy) * 100) / 100;

  const speedGainMs =
    test1Topic.avgTimeTakenMs != null && test2Topic.avgTimeTakenMs != null
      ? Math.round(test1Topic.avgTimeTakenMs - test2Topic.avgTimeTakenMs) // positive = faster on test 2
      : null;

  const confidenceDelta =
    test1Topic.avgConfidence != null && test2Topic.avgConfidence != null
      ? Math.round((test2Topic.avgConfidence - test1Topic.avgConfidence) * 100) / 100
      : null;

  const mistakeTypes = new Set([
    ...Object.keys(test1Topic.mistakeCounts ?? {}),
    ...Object.keys(test2Topic.mistakeCounts ?? {}),
  ]);
  const mistakeShift = {};
  for (const type of mistakeTypes) {
    mistakeShift[type] = (test2Topic.mistakeCounts?.[type] ?? 0) - (test1Topic.mistakeCounts?.[type] ?? 0);
  }

  const difficultyGains = {};
  for (const band of Object.keys(test1Topic.difficultyBreakdown ?? {})) {
    const test2Band = test2Topic.difficultyBreakdown?.[band];
    if (test2Band) {
      difficultyGains[band] = Math.round((test2Band.accuracy - test1Topic.difficultyBreakdown[band].accuracy) * 100) / 100;
    }
  }

  return {
    topicId: test1Topic.topicId,
    topicName: test1Topic.topicName,
    test1Accuracy: test1Topic.accuracy,
    test2Accuracy: test2Topic.accuracy,
    accuracyGain,
    speedGainMs,
    confidenceDelta,
    mistakeShift,
    difficultyGains,
  };
}

/**
 * Should the intervention behind this topic continue, change, stop, or
 * escalate — the question the brief poses directly, answered from a named,
 * configurable threshold ladder rather than scattered conditionals.
 *
 * @param {{accuracyGain: number, test2Accuracy: number}} input
 * @returns {{decision: 'CONTINUE'|'CHANGE'|'STOP'|'ESCALATE', reason: string}}
 */
export function decideInterventionNextStep({ accuracyGain, test2Accuracy }) {
  const cfg = TEST_COMPARISON_CONFIG;

  if (test2Accuracy >= cfg.masteryAccuracyFloor && accuracyGain >= cfg.meaningfulGainFloor) {
    return { decision: 'STOP', reason: `test 2 accuracy reached ${test2Accuracy}% with a real +${accuracyGain}-point gain — goal reached` };
  }
  if (accuracyGain <= cfg.regressionCeiling) {
    return {
      decision: 'ESCALATE',
      reason: `accuracy fell by ${Math.abs(accuracyGain)} points despite the intervention — needs a different approach`,
    };
  }
  if (accuracyGain >= cfg.meaningfulGainFloor) {
    return { decision: 'CONTINUE', reason: `a real +${accuracyGain}-point gain — working, not there yet` };
  }
  return {
    decision: 'CHANGE',
    reason: `only ${accuracyGain >= 0 ? '+' : ''}${accuracyGain} points of movement — not enough to justify staying the course`,
  };
}
