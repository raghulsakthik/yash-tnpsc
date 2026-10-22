import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Layers,
  GraduationCap,
  Award,
  ArrowRight,
  Flame,
  FileText,
  Search,
  Filter,
  BarChart3,
  CheckCheck,
  Brain,
  HelpCircle,
  Clock,
  Lock,
} from 'lucide-react';
import { StructuredCourse, StructuredLesson, StructuredModule } from '../types';
import { StructuredLessonPlayerModal } from './StructuredLessonPlayerModal';
import { BrandLogo } from './BrandLogo';

interface CoursesViewProps {
  courses: StructuredCourse[];
  onUpdateLessonStep: (
    courseId: string,
    lessonId: string,
    stepKey: keyof StructuredLesson['steps'],
    completed: boolean
  ) => void;
  onAddXp?: (amount: number) => void;
  onSwitchToTodayPlan?: () => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  onUpdateLessonStep,
  onAddXp,
  onSwitchToTodayPlan,
}) => {
  const [selectedSubjectGroup, setSelectedSubjectGroup] = useState<
    'All' | 'General Studies' | 'Aptitude & Mental Ability' | 'Language'
  >('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<StructuredCourse | null>(
    null
  );
  const [activeLessonPlayer, setActiveLessonPlayer] = useState<{
    course: StructuredCourse;
    lesson: StructuredLesson;
  } | null>(null);

  // Filter courses by group & search
  const filteredCourses = courses.filter((c) => {
    const matchesGroup =
      selectedSubjectGroup === 'All' || c.subjectGroup === selectedSubjectGroup;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  // Calculate global syllabus completion stats
  const totalCourses = courses.length;
  const completedCoursesCount = courses.filter((c) => c.overallCompletion >= 90).length;
  const avgCompletion = Math.round(
    courses.reduce((acc, c) => acc + c.overallCompletion, 0) / (totalCourses || 1)
  );
  const totalLessonsDone = courses.reduce((acc, c) => acc + c.completedLessons, 0);
  const totalLessonsAll = courses.reduce((acc, c) => acc + c.lessonsCount, 0);

  const handleOpenCourse = (course: StructuredCourse) => {
    setSelectedCourseForDetail(course);
  };

  const handleLaunchLesson = (course: StructuredCourse, lesson: StructuredLesson) => {
    setActiveLessonPlayer({ course, lesson });
  };

  // If a detail modal or lesson player updates, keep detail view in sync
  const currentDetailedCourse = selectedCourseForDetail
    ? courses.find((c) => c.id === selectedCourseForDetail.id) || selectedCourseForDetail
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-3">
            <BrandLogo size="md" showWordmark={false} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-serif font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100">
                  YASH SYLLABUS
                </span>
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className="rounded-md bg-neutral-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-neutral-900">
                  TNPSC Group 2 & 2A
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl font-serif">
                Structured Subject Courses & Completion
              </h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 max-w-3xl">
            Structured long-term syllabus learning programs across General Studies, Aptitude, and Language. Completion requires actual learning verification:{' '}
            <strong className="text-neutral-800 dark:text-neutral-200">
              Learn → Understand → Practice → Pass Official Assessment
            </strong>.
          </p>
        </div>

        {/* Global Progress Snapshot */}
        <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-white border border-neutral-200 text-lg font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white">
            {avgCompletion}%
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-neutral-900 dark:text-white">
              Overall Syllabus Progress
            </span>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {totalLessonsDone} / {totalLessonsAll} Lessons Completed ({completedCoursesCount} Mastered)
            </p>
          </div>
        </div>
      </div>

      {/* Distinction Callout Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-neutral-200/90 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              Structured Courses vs. Today's Adaptive Plan
            </h4>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 max-w-2xl">
              <strong>Courses</strong> track your permanent multi-month syllabus coverage. <strong>Today's Plan</strong> determines your immediate daily queue based on recent test gaps and diagnostic weaknesses.
            </p>
          </div>
        </div>
        {onSwitchToTodayPlan && (
          <button
            onClick={onSwitchToTodayPlan}
            className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-colors shrink-0"
          >
            <span>Open Today's Adaptive Queue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2 sm:border-0 sm:pb-0 dark:border-neutral-800">
          {(['All', 'General Studies', 'Aptitude & Mental Ability', 'Language'] as const).map(
            (group) => (
              <button
                key={group}
                onClick={() => setSelectedSubjectGroup(group)}
                className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                  selectedSubjectGroup === group
                    ? 'bg-neutral-900 text-white font-semibold shadow-xs dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                {group === 'All' ? 'All Courses' : group}
              </button>
            )
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search subjects or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-800 placeholder-neutral-400 transition-all focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-white"
          />
        </div>
      </div>

      {/* Structured Courses Grid (Matching Wireframe Layout) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map((course) => {
          return (
            <div
              key={course.id}
              className="flex flex-col justify-between rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs transition-all hover:border-neutral-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider dark:text-neutral-400">
                    {course.subjectGroup}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      course.overallCompletion >= 75
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : course.overallCompletion >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {course.overallCompletion}% Complete
                  </span>
                </div>

                {/* Course Title */}
                <h3 className="mt-2 text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                  {course.title}
                </h3>
                <p className="mt-1 text-xs line-clamp-2 text-neutral-500 dark:text-neutral-400">
                  {course.description}
                </p>

                {/* Structured Progress Bar */}
                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full bg-neutral-900 dark:bg-white transition-all duration-500"
                      style={{ width: `${course.overallCompletion}%` }}
                    />
                  </div>
                </div>

                {/* Detailed Metric Counters (Lessons, Concepts, Practice, PYQs, Tests) */}
                <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] border-t border-neutral-100 pt-4 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                    <span>Lessons:</span>
                    <strong className="text-neutral-900 dark:text-white font-mono">
                      {course.completedLessons} / {course.lessonsCount}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                    <span>Concepts:</span>
                    <strong className="text-neutral-900 dark:text-white font-mono">
                      {course.completedConcepts} / {course.conceptsCount}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                    <span>Practice:</span>
                    <strong className="text-neutral-900 dark:text-white font-mono">
                      {course.completedPractice} / {course.practiceCount}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                    <span>PYQs:</span>
                    <strong className="text-neutral-900 dark:text-white font-mono">
                      {course.completedPyqs} / {course.pyqsCount}
                    </strong>
                  </div>
                </div>

                {course.modules.length > 0 && (
                  <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>Module Tests:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300 font-mono">
                      {course.completedModuleTests} / {course.moduleTestsCount} Passed
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer Button */}
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => handleOpenCourse(course)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-colors shadow-xs"
                >
                  <span>Continue Course</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED COURSE HIERARCHY DRAWER / MODAL */}
      {currentDetailedCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Course Syllabus Hierarchy Explorer"
        >
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 p-6 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70">
              <div className="flex items-center gap-3">
                <BrandLogo size="md" showWordmark={false} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-serif uppercase tracking-widest text-neutral-500">
                      {currentDetailedCourse.subjectGroup}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {currentDetailedCourse.overallCompletion}% Complete
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                    {currentDetailedCourse.title}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedCourseForDetail(null)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Syllabus Hierarchy */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {/* Progress Summary Card */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-800/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Rigorous Activity Breakdown
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Completed when all 4 steps (Learn, Understand, Practice, Assessment) are fulfilled.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-center">
                      <p className="font-bold text-neutral-900 dark:text-white">
                        {currentDetailedCourse.completedLessons} / {currentDetailedCourse.lessonsCount}
                      </p>
                      <span className="text-[10px] text-neutral-500 uppercase">Lessons</span>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-neutral-900 dark:text-white">
                        {currentDetailedCourse.completedConcepts} / {currentDetailedCourse.conceptsCount}
                      </p>
                      <span className="text-[10px] text-neutral-500 uppercase">Concepts</span>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-neutral-900 dark:text-white">
                        {currentDetailedCourse.completedPractice} / {currentDetailedCourse.practiceCount}
                      </p>
                      <span className="text-[10px] text-neutral-500 uppercase">Practice</span>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-neutral-900 dark:text-white">
                        {currentDetailedCourse.completedPyqs} / {currentDetailedCourse.pyqsCount}
                      </p>
                      <span className="text-[10px] text-neutral-500 uppercase">PYQs</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className="h-full bg-neutral-900 dark:bg-white transition-all duration-300"
                    style={{ width: `${currentDetailedCourse.overallCompletion}%` }}
                  />
                </div>
              </div>

              {/* Modules Hierarchy */}
              <div className="space-y-5">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>Modules & Lesson Architecture</span>
                </h3>

                {currentDetailedCourse.modules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-500 dark:border-neutral-800">
                    Modules for this subject track are currently being synced with TNPSC Commission blueprints.
                  </div>
                ) : (
                  currentDetailedCourse.modules.map((module) => (
                    <div
                      key={module.id}
                      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/80 space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                              Module {module.moduleNumber}
                            </span>
                            {module.moduleTestPassed && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Module Test Passed</span>
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                            {module.title}
                          </h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {module.description}
                          </p>
                        </div>
                      </div>

                      {/* Lessons List inside Module */}
                      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200/80 dark:divide-neutral-800 dark:border-neutral-800 overflow-hidden">
                        {module.lessons.map((les) => (
                          <div
                            key={les.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-white dark:bg-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                  les.isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                }`}
                              >
                                {les.isCompleted ? (
                                  <CheckCheck className="h-4 w-4" />
                                ) : (
                                  <span>{les.lessonNumber}</span>
                                )}
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-neutral-900 dark:text-white">
                                  {les.title}
                                </h5>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                  {les.description}
                                </p>
                                <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400">
                                  <span>{les.durationMinutes} mins</span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Brain className="h-3 w-3" />
                                    {les.keyConcepts.length} Concepts
                                  </span>
                                  {les.pyqReference && (
                                    <>
                                      <span>·</span>
                                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                                        {les.pyqReference}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleLaunchLesson(currentDetailedCourse, les)}
                              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all shrink-0 ${
                                les.isCompleted
                                  ? 'border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                                  : 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900'
                              }`}
                            >
                              <span>{les.isCompleted ? 'Review Lesson' : 'Start Lesson'}</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-neutral-200 p-4 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/50">
              <span className="text-xs text-neutral-500">
                Official Syllabus Architecture · TNPSC Group 2 & 2A
              </span>
              <button
                onClick={() => setSelectedCourseForDetail(null)}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                Close Explorer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE LESSON PLAYER (Learn → Understand → Practice → Assessment) */}
      {activeLessonPlayer && (
        <StructuredLessonPlayerModal
          course={activeLessonPlayer.course}
          lesson={activeLessonPlayer.lesson}
          isOpen={Boolean(activeLessonPlayer)}
          onClose={() => setActiveLessonPlayer(null)}
          onUpdateStep={(lessonId, stepKey, completed) => {
            onUpdateLessonStep(
              activeLessonPlayer.course.id,
              lessonId,
              stepKey,
              completed
            );
          }}
          onAddXp={onAddXp}
        />
      )}
    </div>
  );
};
