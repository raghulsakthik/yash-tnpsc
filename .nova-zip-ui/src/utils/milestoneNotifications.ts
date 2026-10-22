import { AppNotification, StructuredCourse, StructuredModule } from '../types';

export interface ModuleMilestoneParams {
  courseId: string;
  courseTitle: string;
  moduleNumber: number;
  moduleTitle: string;
  xpBonus?: number;
}

/**
 * Computes achievement tier based on module position and difficulty
 */
export function getMilestoneTier(
  moduleNumber: number,
  totalModules: number = 4
): 'Gold' | 'Platinum' | 'Diamond' {
  if (moduleNumber >= totalModules) return 'Diamond';
  if (moduleNumber >= Math.ceil(totalModules / 2)) return 'Platinum';
  return 'Gold';
}

/**
 * Generates dynamic celebratory praise for module completion
 */
export function getMilestonePraise(moduleNumber: number, moduleTitle: string): string {
  const praises = [
    `Curriculum breakthrough! You conquered Module ${moduleNumber}: ${moduleTitle}. Verified TNPSC syllabus competency unlocked.`,
    `Outstanding scholarship! All lessons and assessments in Module ${moduleNumber}: ${moduleTitle} have been fully mastered.`,
    `Milestone achieved! Deep conceptual retention verified for Module ${moduleNumber}: ${moduleTitle}. Keep driving towards rank 1!`,
  ];
  const idx = Math.abs(moduleNumber - 1) % praises.length;
  return praises[idx];
}

/**
 * Creates a fully-formed celebratory Milestone achievement badge notification
 */
export function createModuleMilestoneNotification(
  params: ModuleMilestoneParams
): AppNotification {
  const xpBonus = params.xpBonus ?? 200;
  const tier = getMilestoneTier(params.moduleNumber);

  return {
    id: `milestone-mod-${params.courseId}-${params.moduleNumber}-${Date.now()}`,
    category: 'milestone',
    title: `Module ${params.moduleNumber} Milestone: ${params.moduleTitle} 🏆`,
    message: getMilestonePraise(params.moduleNumber, params.moduleTitle),
    timeAgo: 'Just now',
    timestamp: Date.now(),
    unread: true,
    priority: 'high',
    actionLabel: 'Inspect Module Credential',
    targetView: 'courses',
    badgeLabel: 'Module Milestone',
    isMilestoneBadge: true,
    milestoneType: 'module_completion',
    moduleTitle: params.moduleTitle,
    moduleNumber: params.moduleNumber,
    courseName: params.courseTitle,
    badgeTier: tier,
    xpBonus,
    celebratory: true,
  };
}

/**
 * Compares before and after course state to find newly completed modules
 */
export function getNewlyCompletedModules(
  previousCourse: StructuredCourse,
  updatedCourse: StructuredCourse
): StructuredModule[] {
  const newlyCompleted: StructuredModule[] = [];

  for (const newMod of updatedCourse.modules) {
    const prevMod = previousCourse.modules.find((m) => m.id === newMod.id);
    const wasCompleted =
      prevMod &&
      (prevMod.moduleTestPassed || (prevMod.lessons.length > 0 && prevMod.lessons.every((l) => l.isCompleted)));

    const isNowCompleted =
      newMod.moduleTestPassed || (newMod.lessons.length > 0 && newMod.lessons.every((l) => l.isCompleted));

    if (!wasCompleted && isNowCompleted) {
      newlyCompleted.push(newMod);
    }
  }

  return newlyCompleted;
}
