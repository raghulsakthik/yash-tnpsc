import { StructuredCourse, StructuredLesson } from '../types';

/**
 * Checks if a lesson is legitimately completed across all 4 learning phases:
 * Learn → Understand → Practice → Pass required assessment
 */
export function isLessonFullyCompleted(steps: StructuredLesson['steps']): boolean {
  return (
    Boolean(steps.learnCompleted) &&
    Boolean(steps.understandCompleted) &&
    Boolean(steps.practiceCompleted) &&
    Boolean(steps.assessmentCompleted)
  );
}

/**
 * Computes exact learning activity metrics and weighted overall completion %
 * based on actual student progress (Lessons, Concepts, Practice, PYQs, Module Tests).
 */
export function computeCourseCompletionMetrics(course: StructuredCourse): {
  lessonsCount: number;
  completedLessons: number;
  conceptsCount: number;
  completedConcepts: number;
  practiceCount: number;
  completedPractice: number;
  pyqsCount: number;
  completedPyqs: number;
  moduleTestsCount: number;
  completedModuleTests: number;
  overallCompletion: number;
} {
  let totalLessons = 0;
  let completedLessons = 0;
  let totalConcepts = 0;
  let completedConcepts = 0;
  let totalPractice = 0;
  let completedPractice = 0;
  let totalPyqs = 0;
  let completedPyqs = 0;
  let totalModuleTests = course.modules.length;
  let completedModuleTests = 0;

  course.modules.forEach((mod) => {
    totalPractice += mod.practiceCount || 0;
    completedPractice += mod.completedPractice || 0;
    totalPyqs += mod.pyqsCount || 0;
    completedPyqs += mod.completedPyqs || 0;
    if (mod.moduleTestPassed) {
      completedModuleTests += 1;
    }

    mod.lessons.forEach((les) => {
      totalLessons += 1;
      const lessonDone = isLessonFullyCompleted(les.steps);
      if (lessonDone) {
        completedLessons += 1;
      }

      const conceptsInLesson = les.keyConcepts.length || 3;
      totalConcepts += conceptsInLesson;
      if (les.steps.understandCompleted) {
        completedConcepts += conceptsInLesson;
      } else if (les.steps.learnCompleted) {
        completedConcepts += Math.floor(conceptsInLesson / 2);
      }
    });
  });

  // Safe fallbacks to prevent division by zero
  const safeTotalLessons = Math.max(totalLessons, 1);
  const safeTotalConcepts = Math.max(totalConcepts, 1);
  const safeTotalPractice = Math.max(totalPractice, 1);
  const safeTotalPyqs = Math.max(totalPyqs, 1);
  const safeTotalModuleTests = Math.max(totalModuleTests, 1);

  // Weighted composition:
  // Lessons: 30%, Concepts: 20%, Practice: 25%, PYQs: 15%, Module Tests: 10%
  const lessonRatio = completedLessons / safeTotalLessons;
  const conceptRatio = completedConcepts / safeTotalConcepts;
  const practiceRatio = completedPractice / safeTotalPractice;
  const pyqRatio = completedPyqs / safeTotalPyqs;
  const moduleTestRatio = completedModuleTests / safeTotalModuleTests;

  const weightedPercentage = Math.round(
    lessonRatio * 30 +
      conceptRatio * 20 +
      practiceRatio * 25 +
      pyqRatio * 15 +
      moduleTestRatio * 10
  );

  const overallCompletion = Math.min(100, Math.max(0, weightedPercentage));

  return {
    lessonsCount: totalLessons,
    completedLessons,
    conceptsCount: totalConcepts,
    completedConcepts,
    practiceCount: totalPractice,
    completedPractice,
    pyqsCount: totalPyqs,
    completedPyqs,
    moduleTestsCount: totalModuleTests,
    completedModuleTests,
    overallCompletion,
  };
}

/**
 * Immutably updates a specific lesson step and recalculates the entire course completion
 */
export function updateLessonStep(
  course: StructuredCourse,
  lessonId: string,
  stepKey: keyof StructuredLesson['steps'],
  completed: boolean
): StructuredCourse {
  const updatedModules = course.modules.map((mod) => {
    let moduleUpdated = false;
    const updatedLessons = mod.lessons.map((les) => {
      if (les.id === lessonId) {
        moduleUpdated = true;
        const newSteps = {
          ...les.steps,
          [stepKey]: completed,
        };
        const isCompleted = isLessonFullyCompleted(newSteps);
        return {
          ...les,
          steps: newSteps,
          isCompleted,
        };
      }
      return les;
    });

    if (!moduleUpdated) return mod;

    // Recount module practice & pyq completion
    const allLessonsDone = updatedLessons.every((l) => l.isCompleted);
    return {
      ...mod,
      lessons: updatedLessons,
      completedPractice: Math.min(
        mod.practiceCount,
        updatedLessons.filter((l) => l.steps.practiceCompleted).length * 4
      ),
      completedPyqs: Math.min(
        mod.pyqsCount,
        updatedLessons.filter((l) => l.steps.assessmentCompleted).length * 2
      ),
      moduleTestPassed: allLessonsDone ? true : mod.moduleTestPassed,
    };
  });

  const updatedCourse: StructuredCourse = {
    ...course,
    modules: updatedModules,
    lastStudiedLessonId: lessonId,
  };

  const metrics = computeCourseCompletionMetrics(updatedCourse);

  return {
    ...updatedCourse,
    ...metrics,
  };
}
