import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLessonFullyCompleted,
  computeCourseCompletionMetrics,
  updateLessonStep,
} from './courseCompletion';
import { StructuredCourse } from '../types';

const sampleCourse: StructuredCourse = {
  id: 'test-polity',
  slug: 'indian-polity',
  title: 'Indian Polity',
  subjectGroup: 'General Studies',
  examTrack: 'TNPSC Group 2 & 2A',
  description: 'Constitution and Governance',
  lessonsCount: 2,
  completedLessons: 0,
  conceptsCount: 6,
  completedConcepts: 0,
  practiceCount: 10,
  completedPractice: 0,
  pyqsCount: 5,
  completedPyqs: 0,
  moduleTestsCount: 1,
  completedModuleTests: 0,
  overallCompletion: 0,
  finalCourseTestAvailable: true,
  finalCourseTestPassed: false,
  modules: [
    {
      id: 'mod-1',
      moduleNumber: 1,
      title: 'Constitution Basics',
      description: 'Foundations of Indian Constitution',
      pyqsCount: 5,
      completedPyqs: 0,
      practiceCount: 10,
      completedPractice: 0,
      moduleTestPassed: false,
      lessons: [
        {
          id: 'les-1',
          chapterNumber: 1,
          lessonNumber: 1,
          title: 'What is a Constitution?',
          durationMinutes: 25,
          description: 'Basic introduction',
          keyConcepts: ['Rule of Law', 'Constitutionalism', 'Organic Law'],
          summaryNote: 'A constitution is the fundamental organic law of a state.',
          steps: {
            learnCompleted: false,
            understandCompleted: false,
            practiceCompleted: false,
            assessmentCompleted: false,
          },
          isCompleted: false,
        },
        {
          id: 'les-2',
          chapterNumber: 1,
          lessonNumber: 2,
          title: 'Preamble',
          durationMinutes: 30,
          description: 'Key words and values',
          keyConcepts: ['Sovereign', 'Socialist', 'Secular'],
          summaryNote: 'The Preamble is the identity card of the Constitution.',
          steps: {
            learnCompleted: false,
            understandCompleted: false,
            practiceCompleted: false,
            assessmentCompleted: false,
          },
          isCompleted: false,
        },
      ],
    },
  ],
};

test('isLessonFullyCompleted only returns true when all 4 steps are finished', () => {
  // Incomplete step states
  assert.equal(
    isLessonFullyCompleted({
      learnCompleted: true,
      understandCompleted: false,
      practiceCompleted: false,
      assessmentCompleted: false,
    }),
    false
  );

  assert.equal(
    isLessonFullyCompleted({
      learnCompleted: true,
      understandCompleted: true,
      practiceCompleted: true,
      assessmentCompleted: false,
    }),
    false
  );

  // All 4 completed
  assert.equal(
    isLessonFullyCompleted({
      learnCompleted: true,
      understandCompleted: true,
      practiceCompleted: true,
      assessmentCompleted: true,
    }),
    true
  );
});

test('computeCourseCompletionMetrics computes 0% when no steps completed', () => {
  const metrics = computeCourseCompletionMetrics(sampleCourse);
  assert.equal(metrics.lessonsCount, 2);
  assert.equal(metrics.completedLessons, 0);
  assert.equal(metrics.overallCompletion, 0);
});

test('updateLessonStep progressively updates lesson status and increases course completion', () => {
  let course = updateLessonStep(sampleCourse, 'les-1', 'learnCompleted', true);
  assert.equal(course.modules[0].lessons[0].steps.learnCompleted, true);
  assert.equal(course.modules[0].lessons[0].isCompleted, false);

  course = updateLessonStep(course, 'les-1', 'understandCompleted', true);
  course = updateLessonStep(course, 'les-1', 'practiceCompleted', true);
  course = updateLessonStep(course, 'les-1', 'assessmentCompleted', true);

  // Now les-1 should be fully completed
  assert.equal(course.modules[0].lessons[0].isCompleted, true);
  assert.equal(course.completedLessons, 1);
  assert.ok(course.overallCompletion > 20, 'Overall completion should reflect finished lesson');
});
