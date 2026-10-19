// Phase 17 — MilestoneService: gathers real facts from the event stream,
// question_attempt, Phase 6 (touched topics), Phase 13 (mastery gate), and
// Phase 15 (test-to-test comparison) — all reused unchanged — then asks
// the pure evaluator what's unlocked, and persists anything newly earned.
import { evaluateMilestones, computeCurrentStreak } from '../domain/milestone.mjs';
import { WEAK_ACCURACY_THRESHOLD, STRONG_ACCURACY_THRESHOLD } from '../domain/diagnostic.mjs';
import {
  findFirstTestCompletionEvent,
  countQuestionAttempts,
  findNthAttemptTimestamp,
  findDistinctActivityDates,
  findFirstPyqAttemptTimestamp,
} from '../repository/milestoneRepository.mjs';
import { findAllTouchedTopicStates } from '../repository/learnerStateRepository.mjs';
import { getMasteryGate } from './masteryGateService.mjs';
import { compareLatestAssessments } from './testComparisonService.mjs';
import { findUnlockedAchievements, recordAchievement } from '../repository/achievementRepository.mjs';

function toAchievementDto(row) {
  return { milestoneType: row.milestone_type, achievedAt: row.achieved_at, metadata: row.metadata };
}

async function gatherFacts(learnerId) {
  const [firstTestEventAt, totalAttempts, activityDates, firstPyqAttemptAt, touchedTopics, comparison] = await Promise.all([
    findFirstTestCompletionEvent(learnerId),
    countQuestionAttempts(learnerId),
    findDistinctActivityDates(learnerId),
    findFirstPyqAttemptTimestamp(learnerId),
    findAllTouchedTopicStates(learnerId),
    compareLatestAssessments(learnerId),
  ]);

  const hundredthAttemptAt = totalAttempts >= 100 ? await findNthAttemptTimestamp(learnerId, 100) : null;

  let hasAnyMasteredTopic = false;
  for (const t of touchedTopics) {
    const gate = await getMasteryGate(learnerId, t.topic_id);
    if (gate.ready) {
      hasAnyMasteredTopic = true;
      break;
    }
  }

  const topicRecovery = { found: false, achievedAt: null };
  if (comparison.comparable) {
    const recovered = comparison.topics.find(
      (t) => t.test1Accuracy < WEAK_ACCURACY_THRESHOLD && t.test2Accuracy >= STRONG_ACCURACY_THRESHOLD
    );
    if (recovered) {
      topicRecovery.found = true;
      topicRecovery.achievedAt = comparison.test2CompletedAt;
    }
  }

  const currentStreak = computeCurrentStreak(activityDates);

  return {
    firstTestEventAt,
    hasAnyMasteredTopic,
    totalQuestionAttempts: totalAttempts,
    hundredthAttemptAt,
    currentStreak,
    topicRecovery,
    firstPyqAttemptAt,
  };
}

/**
 * Evaluates every milestone from real evidence and persists anything newly
 * unlocked (idempotent — an already-unlocked achievement is never
 * re-awarded or overwritten). Nothing calls this automatically yet; see
 * docs/phase-17-completion.md.
 */
export async function evaluateAndRecordMilestones(learnerId) {
  const facts = await gatherFacts(learnerId);
  const evaluations = evaluateMilestones(facts);

  const newlyUnlocked = [];
  for (const ev of evaluations) {
    if (ev.unlocked) {
      const recorded = await recordAchievement({ learnerId, milestoneType: ev.type, achievedAt: ev.achievedAt });
      if (recorded) newlyUnlocked.push(recorded.milestone_type);
    }
  }

  const achievements = (await findUnlockedAchievements(learnerId)).map(toAchievementDto);
  return { currentStreak: facts.currentStreak, evaluations, newlyUnlocked, achievements };
}

/** Read-only: current streak plus whatever's already persisted — no evaluation, no writes. */
export async function getAchievements(learnerId) {
  const [activityDates, achievements] = await Promise.all([
    findDistinctActivityDates(learnerId),
    findUnlockedAchievements(learnerId),
  ]);
  return { currentStreak: computeCurrentStreak(activityDates), achievements: achievements.map(toAchievementDto) };
}
