/**
 * Weekly test generation. Two pure, independently testable steps: how many
 * questions come from each topic, and which specific questions those are.
 */

/**
 * Largest-remainder rounding: given each item's raw share of a total,
 * return integer slot counts that sum to exactly `total`. Plain rounding
 * can overshoot or undershoot the total; this never does.
 *
 * @param {Array<{id: string, share: number}>} shares
 * @param {number} total
 * @returns {Map<string, number>} id -> integer slot count
 */
export function allocateSlots(shares, total) {
  const result = new Map();
  if (!Array.isArray(shares) || shares.length === 0 || total <= 0) return result;

  const sumShares = shares.reduce((sum, s) => sum + s.share, 0);
  if (sumShares <= 0) return result;

  const scaled = shares.map((s) => {
    const exact = (s.share / sumShares) * total;
    return { id: s.id, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  let allocated = 0;
  for (const s of scaled) {
    result.set(s.id, s.floor);
    allocated += s.floor;
  }

  // Distribute whatever's left to the largest remainders first; ties break
  // in input order, which keeps this deterministic and testable.
  const remaining = total - allocated;
  const byRemainder = [...scaled].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining; i += 1) {
    const id = byRemainder[i % byRemainder.length].id;
    result.set(id, result.get(id) + 1);
  }

  return result;
}

/**
 * Picks `count` questions from one topic's bank, spread across the
 * available difficulty range rather than clustered, preferring questions
 * she hasn't seen yet.
 *
 * @param {Array<{id: string, difficulty: number}>} questions
 * @param {number} count
 * @param {Set<string>} [seenIds]
 * @returns {Array<object>}
 */
export function pickTopicQuestions(questions, count, seenIds = new Set()) {
  if (!Array.isArray(questions) || questions.length === 0 || count <= 0) return [];
  if (questions.length <= count) return [...questions];

  const byDifficulty = (a, b) => a.difficulty - b.difficulty;
  const unseen = questions.filter((q) => !seenIds.has(q.id)).sort(byDifficulty);
  const seen = questions.filter((q) => seenIds.has(q.id)).sort(byDifficulty);

  // Fill from the unseen pool first — spread across its difficulty range —
  // and only dip into seen questions for whatever's left over. Never let
  // the difficulty spread pull in a seen question while unseen ones remain.
  const picked = spread(unseen, Math.min(count, unseen.length));
  if (picked.length < count) picked.push(...spread(seen, count - picked.length));
  return picked;
}

/** Evenly spaced indices across a (difficulty-sorted) list. */
function spread(sorted, count) {
  if (count <= 0 || sorted.length === 0) return [];
  if (sorted.length <= count) return [...sorted];

  const picked = [];
  const step = sorted.length / count;
  for (let i = 0; i < count; i += 1) {
    picked.push(sorted[Math.floor(i * step)]);
  }
  return picked;
}
