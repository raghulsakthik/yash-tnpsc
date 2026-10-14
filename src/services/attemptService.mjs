// Phase 2 — LearningAttempt service. Read-only plus session-linking; actual
// grading continues to run exclusively through src/lib/attempts.mjs's
// recordAttempt(), called from POST /api/attempts and POST
// /api/tests/:id/submit. Nothing here duplicates that logic.
import { findAttemptById, findAttemptsForSession } from '../repository/attemptRepository.mjs';
import { attachAttemptToSession } from '../repository/sessionRepository.mjs';
import { toLearningAttemptDto } from '../dto/mappers.mjs';
import { NotFoundError } from './errors.mjs';

export async function getAttempt(id) {
  const row = await findAttemptById(id);
  return toLearningAttemptDto(row);
}

export async function listAttemptsForSession(sessionId) {
  const rows = await findAttemptsForSession(sessionId);
  return rows.map(toLearningAttemptDto);
}

export async function linkAttemptToSession(attemptId, sessionId) {
  const attempt = await findAttemptById(attemptId);
  if (!attempt) throw new NotFoundError(`attempt not found: ${attemptId}`);
  await attachAttemptToSession(attemptId, sessionId);
}
