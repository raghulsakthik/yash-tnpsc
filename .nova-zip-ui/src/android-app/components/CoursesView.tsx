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
  ArrowLeft,
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
  Trophy,
  X,
  Target,
  Compass,
  PenTool,
} from 'lucide-react';
import { StructuredCourse, StructuredLesson, StructuredModule } from '../../types';
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
  onCompleteModule?: (courseId: string, moduleId: string) => void;
  onOpenNotifications?: () => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  onUpdateLessonStep,
  onAddXp,
  onSwitchToTodayPlan,
  onCompleteModule,
  onOpenNotifications,
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

  // Keep detailed course in sync with updated props
  const currentDetailedCourse = selectedCourseForDetail
    ? courses.find((c) => c.id === selectedCourseForDetail.id) || selectedCourseForDetail
    : null;

  /* =========================================================================
     IN-SITU COURSE DETAIL VIEW (Full screen responsive drilldown)
     ========================================================================= */
  if (currentDetailedCourse) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in select-none">
        {/* Classical Top Sticky Navigation Header */}
        <div className="sticky top-0 z-20 -mx-1 sm:mx-0 flex items-center justify-between rounded-2xl border border-stone-200/90 bg-stone-50/95 p-3 sm:p-4 backdrop-blur-md shadow-xs dark:border-stone-800/90 dark:bg-stone-900/95 transition-all">
          <button
            onClick={() => setSelectedCourseForDetail(null)}
            className="flex items-center gap-2 rounded-xl border border-stone-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 transition-all cursor-pointer active:scale-95"
            aria-label="Back to all syllabus subjects"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All Subjects</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block rounded-md bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-800 dark:bg-stone-800 dark:text-stone-300">
              {currentDetailedCourse.subjectGroup}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30">
              <Award className="h-3.5 w-3.5" />
              <span>{currentDetailedCourse.overallCompletion}% Mastered</span>
            </span>
          </div>
        </div>

        {/* Course Hero & Overall Metrics */}
        <div className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <span>{currentDetailedCourse.subjectGroup}</span>
                <span>·</span>
                <span>TNPSC Group 2 Curriculum</span>
              </div>
              <h1 className="mt-1 font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                {currentDetailedCourse.title}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-3xl">
                {currentDetailedCourse.description}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                Course Completion Gauge
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {currentDetailedCourse.completedLessons} / {currentDetailedCourse.lessonsCount} Lessons ({currentDetailedCourse.overallCompletion}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
              <div
                className="h-full rounded-full bg-linear-to-r from-orange-500 via-amber-500 to-amber-400 transition-all duration-500"
                style={{ width: `${currentDetailedCourse.overallCompletion}%` }}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/80 text-xs">
            <div className="rounded-xl bg-stone-50 p-2.5 dark:bg-stone-800/50">
              <span className="text-[10px] uppercase font-semibold text-stone-400">Lessons</span>
              <p className="font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                {currentDetailedCourse.completedLessons}/{currentDetailedCourse.lessonsCount}
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 p-2.5 dark:bg-stone-800/50">
              <span className="text-[10px] uppercase font-semibold text-stone-400">Concepts</span>
              <p className="font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                {currentDetailedCourse.completedConcepts}/{currentDetailedCourse.conceptsCount}
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 p-2.5 dark:bg-stone-800/50">
              <span className="text-[10px] uppercase font-semibold text-stone-400">Practice</span>
              <p className="font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                {currentDetailedCourse.completedPractice}/{currentDetailedCourse.practiceCount}
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 p-2.5 dark:bg-stone-800/50">
              <span className="text-[10px] uppercase font-semibold text-stone-400">PYQs Done</span>
              <p className="font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                {currentDetailedCourse.completedPyqs}/{currentDetailedCourse.pyqsCount}
              </p>
            </div>
          </div>
        </div>

        {/* Modules & Lessons Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-amber-500" />
              <span>Syllabus Modules & Chapters</span>
            </h2>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {currentDetailedCourse.modules.length} Modules
            </span>
          </div>

          {currentDetailedCourse.modules.map((module) => {
            const allLessonsInModuleCompleted =
              module.lessons.length > 0 && module.lessons.every((l) => l.isCompleted);
            const isModulePassed = module.moduleTestPassed || allLessonsInModuleCompleted;

            return (
              <div
                key={module.id}
                className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 space-y-3.5 transition-all"
              >
                {/* Module Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3 dark:border-stone-800">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Module {module.moduleNumber}
                      </span>
                      {isModulePassed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Passed</span>
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 truncate mt-0.5">
                      {module.title}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5">
                      {module.description}
                    </p>
                  </div>

                  {/* Module Action: Claim Milestone Badge */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isModulePassed ? (
                      <button
                        onClick={() => onOpenNotifications && onOpenNotifications()}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 transition-all cursor-pointer active:scale-95"
                        title="View celebratory badge in notifications drawer"
                      >
                        <Trophy className="h-3.5 w-3.5 text-amber-600" />
                        <span>Milestone Earned 🎖️</span>
                      </button>
                    ) : (
                      onCompleteModule && (
                        <button
                          onClick={() => onCompleteModule(currentDetailedCourse.id, module.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 transition-all cursor-pointer active:scale-95"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span>Complete Module</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Lessons in this Module */}
                <div className="space-y-2.5">
                  {module.lessons.map((les) => (
                    <div
                      key={les.id}
                      className="group rounded-2xl border border-stone-100 bg-stone-50/70 p-3 sm:p-4 hover:border-amber-300 hover:bg-white dark:border-stone-800/60 dark:bg-stone-800/40 dark:hover:border-stone-700 dark:hover:bg-stone-800/80 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Lesson Number or Checkmark Circle */}
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                              les.isCompleted
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200'
                            }`}
                          >
                            {les.isCompleted ? (
                              <CheckCheck className="h-4 w-4" />
                            ) : (
                              <span>{les.lessonNumber}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-serif text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
                              {les.title}
                            </h4>
                            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                              {les.description}
                            </p>
                          </div>
                        </div>

                        {/* Start Lesson Action Button */}
                        <button
                          onClick={() => setActiveLessonPlayer({ course: currentDetailedCourse, lesson: les })}
                          className={`flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                            les.isCompleted
                              ? 'border border-stone-200 bg-white text-stone-800 shadow-2xs hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200'
                              : 'bg-amber-500 text-white shadow-xs hover:bg-amber-600'
                          }`}
                        >
                          <span>{les.isCompleted ? 'Review' : 'Start Lesson'}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* 4-Step Learning Verification Indicators (Interactive Pills) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-[11px]">
                        {/* Step 1: Learn */}
                        <div
                          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors ${
                            les.steps.learnCompleted
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                              : 'bg-white/80 text-stone-500 dark:bg-stone-900/60 dark:text-stone-400'
                          }`}
                        >
                          {les.steps.learnCompleted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <BookOpen className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          )}
                          <span className="truncate">1. Learn</span>
                        </div>

                        {/* Step 2: Understand */}
                        <div
                          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors ${
                            les.steps.understandCompleted
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                              : 'bg-white/80 text-stone-500 dark:bg-stone-900/60 dark:text-stone-400'
                          }`}
                        >
                          {les.steps.understandCompleted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Brain className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          )}
                          <span className="truncate">2. Understand</span>
                        </div>

                        {/* Step 3: Practice */}
                        <div
                          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors ${
                            les.steps.practiceCompleted
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                              : 'bg-white/80 text-stone-500 dark:bg-stone-900/60 dark:text-stone-400'
                          }`}
                        >
                          {les.steps.practiceCompleted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <PenTool className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          )}
                          <span className="truncate">3. Practice</span>
                        </div>

                        {/* Step 4: Assessment */}
                        <div
                          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors ${
                            les.steps.assessmentCompleted
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                              : 'bg-white/80 text-stone-500 dark:bg-stone-900/60 dark:text-stone-400'
                          }`}
                        >
                          {les.steps.assessmentCompleted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Target className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          )}
                          <span className="truncate">4. PYQ Test</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Player */}
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
  }

  /* =========================================================================
     SYLLABUS MAIN LIST VIEW (Mobile-first, clean, highly responsive)
     ========================================================================= */
  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 animate-in fade-in select-none">
      {/* Classical Syllabus Hub Header */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              <span>TNPSC ACADEMY</span>
              <span>·</span>
              <span>OFFICIAL SYLLABUS TRACKS</span>
            </div>
            <h1 className="mt-1 font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Curriculum & Subject Courses
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-2xl">
              Comprehensive syllabus coverage across General Studies, Aptitude & Mental Ability, and Languages with verified multi-step mastery.
            </p>
          </div>

          {/* Compact Global Progress Gauge Card */}
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-linear-to-br from-amber-50/80 to-orange-50/50 p-3 sm:p-4 dark:border-amber-900/40 dark:from-stone-900 dark:to-stone-900 shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 font-mono text-base font-bold text-white shadow-xs">
              {avgCompletion}%
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Syllabus Mastery
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {totalLessonsDone} / {totalLessonsAll} Lessons Done
              </p>
            </div>
          </div>
        </div>

        {/* Global Progress Line */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className="h-full rounded-full bg-linear-to-r from-orange-500 via-amber-500 to-amber-400 transition-all duration-500"
            style={{ width: `${avgCompletion}%` }}
          />
        </div>
      </div>

      {/* Horizontally Scrollable Category Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Horizontal Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(['All', 'General Studies', 'Aptitude & Mental Ability', 'Language'] as const).map(
            (group) => {
              const isSelected = selectedSubjectGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => setSelectedSubjectGroup(group)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-xs font-bold'
                      : 'border border-stone-200/80 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800'
                  }`}
                >
                  {group === 'All' ? 'All Subjects' : group}
                </button>
              );
            }
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
          <input
            type="text"
            placeholder="Search subjects or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200/90 bg-white py-1.5 pl-8.5 pr-8 text-xs text-stone-900 shadow-2xs placeholder-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map((course) => {
          return (
            <div
              key={course.id}
              className="flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-amber-400/60 hover:shadow-md dark:border-stone-800/90 dark:bg-stone-900 dark:hover:border-stone-700 transition-all space-y-4"
            >
              <div className="space-y-3">
                {/* Header Tag & Completion Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {course.subjectGroup}
                  </span>
                  <span
                    className={`text-xs font-bold font-mono ${
                      course.overallCompletion >= 75
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : course.overallCompletion >= 40
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {course.overallCompletion}%
                  </span>
                </div>

                {/* Course Title */}
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 leading-snug">
                    {course.title}
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-orange-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${course.overallCompletion}%` }}
                  />
                </div>

                {/* Clean Unboxed Metadata Badges */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400 pt-1">
                  <span>{course.lessonsCount} Lessons</span>
                  <span aria-hidden="true">·</span>
                  <span>{course.conceptsCount} Concepts</span>
                  <span aria-hidden="true">·</span>
                  <span>{course.pyqsCount} PYQs</span>
                  <span aria-hidden="true">·</span>
                  <span>{course.modules.length} Modules</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSelectedCourseForDetail(course)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <span>Explore Syllabus & Lessons</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="rounded-3xl border border-dashed border-stone-200 p-8 text-center text-xs text-stone-500 dark:border-stone-800">
          No courses matching your search criteria.
        </div>
      )}

      {/* Modal Player */}
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
