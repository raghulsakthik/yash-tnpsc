// Phase 29.1 — AiKnowledgeBaseService. The real retrieval layer (29.1's
// "semantic search"/"RAG retrieval" ask) — keyword-ranked over real,
// approved content (aiKnowledgeBase.mjs's own doc explains why this is
// not embedding-based: no provider is configured in this environment).
import { rankByKeywordOverlap } from '../domain/aiKnowledgeBase.mjs';
import { findAllApprovedQuestionTexts } from '../repository/aiKnowledgeRepository.mjs';

export async function searchKnowledgeBase(queryText, limit = 10) {
  const candidates = await findAllApprovedQuestionTexts();
  const ranked = rankByKeywordOverlap(
    queryText,
    candidates.map((c) => ({ id: c.id, topicId: c.topic_id, topicName: c.topic_name, text: c.text })),
    limit
  );
  return {
    query: queryText,
    results: ranked.map((r) => ({ questionId: r.id, topicId: r.topicId, topicName: r.topicName, score: r.score })),
    retrievalMethod: 'keyword-overlap',
    disclaimer: 'no embedding provider is configured in this environment — this is real keyword-based retrieval, not semantic similarity',
  };
}
