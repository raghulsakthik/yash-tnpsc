/**
 * Phase 18 — Intermediate Progression Engine.
 *
 * "Foundation -> Intermediate is a progression state, not a hardcoded
 * calendar date." The state is derived from real Phase 13 Mastery Gate
 * results across every real foundation topic (reused, unchanged) — once
 * every one of them is MASTERED or RETAINED, the candidate pool expands to
 * include the next layer of real, content-backed topics.
 */

export const ProgressionTier = Object.freeze({
  FOUNDATION: 'FOUNDATION',
  INTERMEDIATE: 'INTERMEDIATE',
});

/**
 * @param {Array<{topicId: string, ready: boolean}>} foundationGateResults one Phase 13 gate result per real foundation topic
 * @returns {{tier: string, satisfiedCount: number, totalCount: number, reason: string}}
 */
export function evaluateProgressionTier(foundationGateResults) {
  const totalCount = foundationGateResults.length;
  const satisfiedCount = foundationGateResults.filter((g) => g.ready).length;
  const satisfied = totalCount > 0 && satisfiedCount === totalCount;

  return {
    tier: satisfied ? ProgressionTier.INTERMEDIATE : ProgressionTier.FOUNDATION,
    satisfiedCount,
    totalCount,
    reason: satisfied
      ? `all ${totalCount} foundation topics are mastered or retained — intermediate candidates unlocked`
      : `${satisfiedCount}/${totalCount} foundation topics mastered so far — still in the foundation phase`,
  };
}

/**
 * Foundation candidates are always in the pool; intermediate candidates
 * join only once the tier allows it.
 *
 * @param {object} input
 * @param {string} input.tier one of ProgressionTier
 * @param {Array<string>} input.foundationCandidateIds
 * @param {Array<string>} input.intermediateCandidateIds
 * @returns {{tier: string, topicIds: Array<string>}}
 */
export function buildCandidatePool({ tier, foundationCandidateIds, intermediateCandidateIds }) {
  const topicIds =
    tier === ProgressionTier.INTERMEDIATE ? [...foundationCandidateIds, ...intermediateCandidateIds] : [...foundationCandidateIds];
  return { tier, topicIds };
}
