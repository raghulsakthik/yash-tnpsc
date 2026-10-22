import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMilestoneTier,
  getMilestonePraise,
  createModuleMilestoneNotification,
  getNewlyCompletedModules,
} from './milestoneNotifications';
import { StructuredCourse } from '../types';

test('getMilestoneTier assigns correct tier based on module number', () => {
  assert.equal(getMilestoneTier(1, 4), 'Gold');
  assert.equal(getMilestoneTier(2, 4), 'Platinum');
  assert.equal(getMilestoneTier(3, 4), 'Platinum');
  assert.equal(getMilestoneTier(4, 4), 'Diamond');
});

test('getMilestonePraise includes module number and title', () => {
  const praise = getMilestonePraise(1, 'Constitutional Framework');
  assert.ok(praise.includes('Module 1'));
  assert.ok(praise.includes('Constitutional Framework'));
});

test('createModuleMilestoneNotification generates valid AppNotification with milestone badge metadata', () => {
  const notif = createModuleMilestoneNotification({
    courseId: 'polity-101',
    courseTitle: 'Indian Polity & Governance',
    moduleNumber: 1,
    moduleTitle: 'Constitutional Framework',
    xpBonus: 250,
  });

  assert.equal(notif.category, 'milestone');
  assert.equal(notif.isMilestoneBadge, true);
  assert.equal(notif.celebratory, true);
  assert.equal(notif.xpBonus, 250);
  assert.equal(notif.badgeTier, 'Gold');
  assert.equal(notif.moduleNumber, 1);
  assert.equal(notif.moduleTitle, 'Constitutional Framework');
  assert.equal(notif.courseName, 'Indian Polity & Governance');
  assert.equal(notif.unread, true);
  assert.equal(notif.targetView, 'courses');
});

test('getNewlyCompletedModules accurately detects newly finished modules', () => {
  const mockCourseBefore: StructuredCourse = {
    id: 'course-1',
    slug: 'polity',
    title: 'Indian Polity',
    subjectGroup: 'General Studies',
    examTrack: 'TNPSC Group 2',
    description: 'Polity test course',
    lessonsCount: 2,
    completedLessons: 0,
    conceptsCount: 4,
    completedConcepts: 0,
    practiceCount: 2,
    completedPractice: 0,
    pyqsCount: 2,
    completedPyqs: 0,
    moduleTestsCount: 1,
    completedModuleTests: 0,
    overallCompletion: 0,
    finalCourseTestAvailable: false,
    finalCourseTestPassed: false,
    modules: [
      {
        id: 'mod-1',
        moduleNumber: 1,
        title: 'Preamble',
        description: 'Module 1 description',
        pyqsCount: 2,
        completedPyqs: 0,
        practiceCount: 2,
        completedPractice: 0,
        moduleTestPassed: false,
        lessons: [
          {
            id: 'les-1',
            chapterNumber: 1,
            lessonNumber: 1,
            title: 'Intro',
            durationMinutes: 15,
            description: '',
            keyConcepts: [],
            summaryNote: '',
            isCompleted: false,
            steps: {
              learnCompleted: false,
              understandCompleted: false,
              practiceCompleted: false,
              assessmentCompleted: false,
            },
          },
        ],
      },
    ],
  };

  const mockCourseAfter: StructuredCourse = {
    ...mockCourseBefore,
    completedLessons: 1,
    overallCompletion: 100,
    modules: [
      {
        ...mockCourseBefore.modules[0],
        moduleTestPassed: true,
        lessons: [
          {
            ...mockCourseBefore.modules[0].lessons[0],
            isCompleted: true,
            steps: {
              learnCompleted: true,
              understandCompleted: true,
              practiceCompleted: true,
              assessmentCompleted: true,
            },
          },
        ],
      },
    ],
  };

  const newlyCompleted = getNewlyCompletedModules(mockCourseBefore, mockCourseAfter);
  assert.equal(newlyCompleted.length, 1);
  assert.equal(newlyCompleted[0].id, 'mod-1');

  // If already completed before, should not detect as newly completed
  const nextCheck = getNewlyCompletedModules(mockCourseAfter, mockCourseAfter);
  assert.equal(nextCheck.length, 0);
});
