import { validateLearningSession } from '../domain/validation.mjs';
import {
  createLearningSession,
  completeLearningSession,
  findLearningSessionById,
} from '../repository/sessionRepository.mjs';
import { toLearningSessionDto } from '../dto/mappers.mjs';
import { findAttemptsForSession } from '../repository/attemptRepository.mjs';
import { toLearningAttemptDto } from '../dto/mappers.mjs';
import { ValidationError, NotFoundError } from './errors.mjs';

export async function startLearningSession({ learnerId, topicId, sessionType, metadata }) {
  const errors = validateLearningSession({ learnerId, sessionType });
  if (errors.length) throw new ValidationError(errors);
  const row = await createLearningSession({ learnerId, topicId, sessionType, metadata });
  return toLearningSessionDto(row);
}

export async function completeSession(id) {
  const row = await completeLearningSession(id);
  if (!row) throw new NotFoundError(`learning session not found: ${id}`);
  return toLearningSessionDto(row);
}

export async function getSessionWithAttempts(id) {
  const row = await findLearningSessionById(id);
  if (!row) return null;
  const attempts = await findAttemptsForSession(id);
  return { ...toLearningSessionDto(row), attempts: attempts.map(toLearningAttemptDto) };
}
