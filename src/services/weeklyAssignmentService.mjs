// Phase 25 — WeeklyAssignmentService. Calls getWeeklyPlan() (Phase 16,
// unchanged) for the full week, then — the one new read — checks whether a
// real, active game (Phase 22, unchanged) covers Friday's already-chosen
// topic, and overlays it if so. getWeeklyPlan() itself is never modified;
// every other day of the week passes through exactly as Phase 16 built it.
import { getWeeklyPlan } from './weeklyPlanService.mjs';
import { attachGameToWeeklyPlan } from '../domain/weeklyAssignment.mjs';
import { findActiveGameDefinitionForTopic } from '../repository/weeklyAssignmentRepository.mjs';

export async function getWeeklyAssignment(learnerId) {
  const plan = await getWeeklyPlan(learnerId);

  const fridayTopicId = plan.days.FRIDAY?.topicId ?? null;
  const gameMatch = fridayTopicId ? await findActiveGameDefinitionForTopic(fridayTopicId) : null;

  return attachGameToWeeklyPlan(plan, gameMatch);
}
