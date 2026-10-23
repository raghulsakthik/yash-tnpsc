import { validateLearner } from '../domain/validation.mjs';
import { createLearner, createLearnerProfile, findLearnerById } from '../repository/learnerRepository.mjs';
import { toLearnerDto } from '../dto/mappers.mjs';
import { ValidationError } from './errors.mjs';

export async function registerLearner({ name, exam, language, dailyGoalMinutes }) {
  const errors = validateLearner({ name });
  if (errors.length) throw new ValidationError(errors);

  const learnerRow = await createLearner({ name });
  await createLearnerProfile({ learnerId: learnerRow.id, exam, language, dailyGoalMinutes });
  return toLearnerDto(learnerRow);
}

export async function getLearner(id) {
  const row = await findLearnerById(id);
  return toLearnerDto(row);
}
