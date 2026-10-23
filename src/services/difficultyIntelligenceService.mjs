// Phase 26.6 — DifficultyIntelligenceService. Composes the authored
// difficulty (Phase 1, unchanged) with real aggregate attempt evidence
// (difficultyIntelligenceRepository.mjs) into a suggested delta
// (difficultyIntelligence.mjs) — never writes it back to question.difficulty.
import { suggestDifficultyAdjustment } from '../domain/difficultyIntelligence.mjs';
import { findPerformanceForQuestion } from '../repository/difficultyIntelligenceRepository.mjs';
import { findPyqQuestionById } from '../repository/pyqCatalogRepository.mjs';
import { NotFoundError } from './errors.mjs';

export async function getDifficultyIntelligence(questionId) {
  const question = await findPyqQuestionById(questionId);
  if (!question) throw new NotFoundError(`no real PYQ question ${questionId}`);

  const perf = await findPerformanceForQuestion(questionId);
  const attemptCount = perf.attemptCount;
  const accuracy = attemptCount > 0 ? perf.correctCount / attemptCount : 0;
  const skipRate = attemptCount > 0 ? perf.skipCount / attemptCount : 0;
  const hintRate = attemptCount > 0 ? perf.hintCount / attemptCount : 0;

  const suggestion = suggestDifficultyAdjustment({
    authoredDifficulty: question.difficulty,
    attemptCount,
    accuracy,
    skipRate,
    hintRate,
  });

  return {
    questionId,
    authoredDifficulty: question.difficulty,
    ...suggestion,
    evidence: {
      attemptCount,
      accuracy: Math.round(accuracy * 1000) / 1000,
      skipRate: Math.round(skipRate * 1000) / 1000,
      hintRate: Math.round(hintRate * 1000) / 1000,
      averageTimeTakenMs: perf.averageTimeTakenMs,
      // Load-bearing honesty: one real learner, not a real population. See
      // module doc in difficultyIntelligence.mjs.
      populationCaveat: 'this system is single-tenant — every figure above is one real learner\'s history, not a true population',
    },
  };
}
