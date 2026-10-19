/**
 * Phase 30.7 — AI Model Evaluation & Versioning. Every AI capability's
 * real current version, in one place — never scattered string literals at
 * call sites. Bumping any of these is the real signal a prompt/retrieval/
 * dataset/algorithm actually changed; nothing here is cosmetic.
 */

import { MODEL } from '../../lib/ai/provider.mjs';

export const AI_VERSIONS = Object.freeze({
  'ai-tutor': {
    modelVersion: MODEL, // src/lib/ai/provider.mjs's own real, current model — never a second, stale copy of this string
    promptVersion: 'prompt-v1', // domain/ai/promptTemplates.mjs
    retrievalVersion: 'retrieval-v1-keyword', // domain/aiKnowledgeBase.mjs — keyword overlap, no embeddings yet
    datasetVersion: 'dataset-v1', // domain/aiTrainingDataset.mjs
    algorithmVersion: 'fallback-v1', // domain/ai/deterministicFallback.mjs
  },
});

export function getVersionInfo(capability) {
  return AI_VERSIONS[capability] ?? null;
}
