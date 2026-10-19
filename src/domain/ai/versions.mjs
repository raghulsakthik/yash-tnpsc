/**
 * Phase 30.7 — AI Model Evaluation & Versioning. Every AI capability's
 * real current version, in one place — never scattered string literals at
 * call sites. Bumping any of these is the real signal a prompt/retrieval/
 * dataset/algorithm actually changed; nothing here is cosmetic.
 */

export const AI_VERSIONS = Object.freeze({
  'ai-tutor': {
    modelVersion: 'claude-haiku-4-5-20251001', // src/lib/ai/provider.mjs's own MODEL, unchanged
    promptVersion: 'prompt-v1', // domain/ai/promptTemplates.mjs
    retrievalVersion: 'retrieval-v1-keyword', // domain/aiKnowledgeBase.mjs — keyword overlap, no embeddings yet
    datasetVersion: 'dataset-v1', // domain/aiTrainingDataset.mjs
    algorithmVersion: 'fallback-v1', // domain/ai/deterministicFallback.mjs
  },
});

export function getVersionInfo(capability) {
  return AI_VERSIONS[capability] ?? null;
}
