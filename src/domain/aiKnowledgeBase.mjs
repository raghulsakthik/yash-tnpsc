/**
 * Phase 29.1 — AI Knowledge Base / retrieval scoring.
 *
 * No embedding provider is configured in this environment (confirmed:
 * no API key, no vector-capable dependency in package.json — see
 * completion report). Building random or hash-based "embeddings" to
 * pretend otherwise would be fabricating a capability, the one thing this
 * project has never done. This module is the honest real substitute: real
 * keyword-overlap ranking over real, approved content (question.status =
 * 'PUBLISHED') — a working retrieval layer today, and exactly the
 * interface a real embedding-based ranker would slot in behind later
 * without any caller needing to change.
 */

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Real term-overlap score, 0..1 — not semantic similarity, honest about it.
 *
 * @param {string} query
 * @param {string} document
 */
export function keywordOverlapScore(query, document) {
  const queryTerms = new Set(tokenize(query));
  if (queryTerms.size === 0) return 0;
  const docTerms = new Set(tokenize(document));
  let hits = 0;
  for (const term of queryTerms) if (docTerms.has(term)) hits += 1;
  return Math.round((hits / queryTerms.size) * 1000) / 1000;
}

/**
 * @param {string} query
 * @param {Array<{id: string, text: string}>} candidates
 * @param {number} [limit]
 */
export function rankByKeywordOverlap(query, candidates, limit = 10) {
  return candidates
    .map((c) => ({ ...c, score: keywordOverlapScore(query, c.text) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
