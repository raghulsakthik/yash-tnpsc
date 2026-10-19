// Phase 21 — PyqService. getNextPyqQuestion mirrors GET /api/questions/next
// (Phase 1, unchanged) exactly — same selectQuestion()/difficultyBand(),
// same target-difficulty read from learner_topic_state — filtered to real
// past-paper-tagged questions. Answers still go through the existing
// POST /api/attempts unchanged: a PYQ attempt is not a different kind of
// attempt, just evidence that happens to be past-paper-sourced.
import { query } from '../lib/db.mjs';
import { selectQuestion } from '../domain/selection.mjs';
import { difficultyBand } from '../domain/difficulty.mjs';
import { summarizePyqPerformance } from '../domain/pyq.mjs';
import { findPyqCandidatesForTopic, findPyqVsAuthoredPerformance } from '../repository/pyqRepository.mjs';
import { NotFoundError } from './errors.mjs';

export async function getNextPyqQuestion(learnerId, topicId) {
  const { rows: stateRows } = await query(
    `SELECT current_difficulty, attempt_count FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, topicId]
  );
  const targetDifficulty = Number(stateRows[0]?.current_difficulty ?? 0.3);

  const candidates = await findPyqCandidatesForTopic(learnerId, topicId);
  if (candidates.length === 0) {
    throw new NotFoundError(`no real past-paper-tagged questions for ${topicId} yet`);
  }

  const chosen = selectQuestion(
    candidates.map((c) => ({ ...c, seenCount: c.seen_count, attemptsSinceLastSeen: c.attempts_since_last_seen })),
    targetDifficulty
  );

  return {
    questionId: chosen.id,
    topicId,
    prompt: chosen.prompt,
    options: chosen.options,
    estimatedSeconds: chosen.estimated_seconds,
    difficulty: difficultyBand(chosen.difficulty),
    targetDifficulty,
    source: chosen.source,
    attemptCount: stateRows[0]?.attempt_count ?? 0,
  };
}

export async function getPyqPerformanceSummary(learnerId) {
  const rows = await findPyqVsAuthoredPerformance(learnerId);
  return summarizePyqPerformance(rows);
}
