// Phase 2 — minimal Assessment service. Only establishes that the entity can
// be created and read through a validated service call. The blueprint
// engine (topic coverage, difficulty, question count, time, prerequisites,
// learner exposure) is explicitly Phase 9 scope and is not implemented here.
import { validateAssessment } from '../domain/validation.mjs';
import { createAssessment, findAssessmentById } from '../repository/assessmentRepository.mjs';
import { toAssessmentDto } from '../dto/mappers.mjs';
import { ValidationError } from './errors.mjs';

export async function createDraftAssessment({ learnerId, type, metadata }) {
  const errors = validateAssessment({ type });
  if (errors.length) throw new ValidationError(errors);
  const row = await createAssessment({ learnerId, type, metadata });
  return toAssessmentDto(row);
}

export async function getAssessment(id) {
  const row = await findAssessmentById(id);
  return toAssessmentDto(row);
}
