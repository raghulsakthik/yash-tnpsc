// Phase 16 — WeeklyPlanService: gathers real evidence from Phase 3
// (eligibility), Phase 6 (live learner summary/classification), Phase 7
// (gated initial action), and the revision/PYQ reads above, then hands it
// to the pure buildWeeklyPlan(). Nothing here re-derives a classification
// or re-walks the prerequisite graph — every number comes from a phase
// that already computed it.
import { buildWeeklyPlan } from '../domain/weeklyPlan.mjs';
import { getInitialLearningAction } from './learningPlanService.mjs';
import { getLearnerSummary } from './learnerStateService.mjs';
import { checkDefaultAssessmentEligibility } from './defaultAssessmentService.mjs';
import {
  findDueRevisionTopic,
  findPyqCandidateTopic,
  findTopicName,
  countCompletedDefaultAssessments,
} from '../repository/weeklyPlanRepository.mjs';

// Phase 4's classification states worth building a practice day around,
// most urgent first.
const WEAKNESS_PRIORITY = { PREREQUISITE_BLOCKED: 0, CRITICAL: 1, WEAK: 2 };

export async function getWeeklyPlan(learnerId) {
  const [initialAction, summary, revision, pyqTopic, eligibility, completedCount] = await Promise.all([
    getInitialLearningAction(learnerId),
    getLearnerSummary(learnerId),
    findDueRevisionTopic(learnerId),
    findPyqCandidateTopic(learnerId),
    checkDefaultAssessmentEligibility(learnerId),
    countCompletedDefaultAssessments(learnerId),
  ]);

  // Monday's lesson is Phase 7's gated action only when it's genuinely a
  // foundation step — once nothing's gated anymore, "lesson day" shouldn't
  // keep pointing at a topic she's already past.
  const lessonAction = initialAction.action === 'FOUNDATION' ? initialAction : null;

  const weakest = summary.classifications
    .filter((c) => c.classification in WEAKNESS_PRIORITY)
    .sort((a, b) => WEAKNESS_PRIORITY[a.classification] - WEAKNESS_PRIORITY[b.classification])[0];

  let practiceTopic = null;
  if (weakest) {
    const topicName = await findTopicName(weakest.topicId);
    practiceTopic = { topicId: weakest.topicId, topicName, reason: weakest.reason };
  } else if (initialAction.action !== 'FOUNDATION' && initialAction.topicId) {
    // Nothing classified as weak yet (e.g. she hasn't been assessed) — fall
    // back to Phase 7's own recommendation rather than leaving the day empty.
    practiceTopic = { topicId: initialAction.topicId, topicName: initialAction.topicName, reason: initialAction.reason };
  }

  return buildWeeklyPlan({
    lessonAction,
    practiceTopic,
    revisionDueCount: revision.dueCount,
    revisionTopic: revision.topic,
    pyqTopic,
    weakestTopicForGame: practiceTopic,
    assessmentEligibility: eligibility,
    hasCompletedDefaultAssessment: completedCount > 0,
  });
}
