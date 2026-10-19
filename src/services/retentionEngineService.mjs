// Phase 24 — RetentionEngineService. Reads the stored retention_score and
// misconceptionRisk via getTopicState() (Phase 6, unchanged) and
// last_studied_at via findTopicStateRow() (Phase 6's own repository,
// unchanged — queried a second time rather than touching Phase 6's service
// to expose a field it doesn't currently return, the same small-duplication
// precedent every prior phase has used instead of modifying working code).
import { estimateEffectiveRetention } from '../domain/retentionEngine.mjs';
import { getTopicState } from './learnerStateService.mjs';
import { findTopicStateRow } from '../repository/learnerStateRepository.mjs';
import { NotFoundError } from './errors.mjs';

function daysSince(date, now = new Date()) {
  if (!date) return null;
  return Math.max(0, (now.getTime() - new Date(date).getTime()) / 86400000);
}

export async function getEffectiveRetention(learnerId, topicId) {
  const row = await findTopicStateRow(learnerId, topicId);
  if (!row) throw new NotFoundError(`no state for learner ${learnerId} on topic ${topicId} yet`);

  const topicState = await getTopicState(learnerId, topicId);

  const result = estimateEffectiveRetention({
    storedRetention: topicState.retention,
    daysSinceLastStudied: daysSince(row.last_studied_at),
    misconceptionRisk: topicState.misconceptionRisk,
  });

  return {
    topicId,
    ...result,
    evidence: { ...topicState.evidence, lastStudiedAt: row.last_studied_at },
  };
}
