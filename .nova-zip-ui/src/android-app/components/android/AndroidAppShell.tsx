import React, { useState } from 'react';
import {
  UserProfile,
  Course,
  TodayUnit,
  SubjectMastery,
  WeakArea,
  StructuredCourse,
  StructuredLesson,
  AppNotification,
  PracticeQuestion,
  NoteItem,
  ResourceItem,
  PYQItem,
  MistakeItem,
  TestSession,
  ActivityDay,
  DailyGoal,
} from '../../../types';
import { AndroidStatusBar } from './AndroidStatusBar';
import { AndroidTopBar } from './AndroidTopBar';
import { AndroidBottomNav, AndroidTabKey } from './AndroidBottomNav';
import { AndroidDrawer } from './AndroidDrawer';
import { AndroidSnackbar, SnackbarMessage } from './AndroidSnackbar';
import { AndroidInstallBanner } from './AndroidInstallBanner';

// Main app content views
import { ContinueLearningCard } from '../ContinueLearningCard';
import { TodayLearningQueue } from '../TodayLearningQueue';
import { LearningActivityHeatmap } from '../LearningActivityHeatmap';
import { SubjectMasteryCard } from '../SubjectMasteryCard';
import { WeakAreasCard } from '../WeakAreasCard';
import { ProgressPanel } from '../ProgressPanel';
import { CoursesView } from '../CoursesView';
import { PracticeView } from '../PracticeView';
import { PYQView } from '../PYQView';
import { QuickLabView } from '../QuickLabView';
import { TestsView } from '../TestsView';
import { MistakesView } from '../MistakesView';
import { JourneyView } from '../JourneyView';
import { NotesView } from '../NotesView';
import { BookmarksView } from '../BookmarksView';

interface AndroidAppShellProps {
  profile: UserProfile;
  courses: Course[];
  structuredCourses: StructuredCourse[];
  todayUnits: TodayUnit[];
  subjectMastery: SubjectMastery[];
  weakAreas: WeakArea[];
  activities: ActivityDay[];
  notifications: AppNotification[];
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenNotifications: () => void;
  onOpenAdminPortal: () => void;
  onOpenProfile: () => void;
  onToggleTodayUnit: (id: string) => void;
  onLaunchTodayUnit: (unit: TodayUnit) => void;
  onUpdateLessonStep: (
    courseId: string,
    lessonId: string,
    stepKey: keyof StructuredLesson['steps'],
    completed: boolean
  ) => void;
  onCompleteModule: (courseId: string, moduleId: string) => void;
  onPracticeTopic: (topic: string) => void;
  onUpdateDailyGoal: (dailyGoal: DailyGoal) => void;
  onLogGoalProgress: (minutes: number) => void;
  onToggleBookmark: (courseId: string) => void;
  practiceQuestions: PracticeQuestion[];
  notes: NoteItem[];
  resources: ResourceItem[];
  pyqs: PYQItem[];
  mistakes: MistakeItem[];
  tests: TestSession[];
  onOpenCourseModal: (course: Course) => void;
  onAddXp?: (amount: number) => void;
  onAddNote?: (note: Omit<NoteItem, 'id' | 'date'>) => void;
  onDeleteNote?: (id: string) => void;
  viewMode: 'device' | 'mobile' | 'desktop';
  onChangeViewMode: (mode: 'device' | 'mobile' | 'desktop') => void;
}

export const AndroidAppShell: React.FC<AndroidAppShellProps> = ({
  profile,
  courses,
  structuredCourses,
  todayUnits,
  subjectMastery,
  weakAreas,
  activities,
  notifications,
  isDarkMode,
  onToggleDarkMode,
  onOpenNotifications,
  onOpenAdminPortal,
  onOpenProfile,
  onToggleTodayUnit,
  onLaunchTodayUnit,
  onUpdateLessonStep,
  onCompleteModule,
  onPracticeTopic,
  onUpdateDailyGoal,
  onLogGoalProgress,
  onToggleBookmark,
  practiceQuestions,
  notes,
  resources,
  pyqs,
  mistakes,
  tests,
  onOpenCourseModal,
  onAddXp,
  onAddNote,
  onDeleteNote,
  viewMode,
  onChangeViewMode,
}) => {
  const [activeTab, setActiveTab] = useState<AndroidTabKey>('today');
  const [subView, setSubView] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);

  // Masterclass course for hero card
  // courses[0] || courses[0] in the original design file was a no-op
  // fallback (both sides are the same expression) -- when courses is still
  // empty during the initial load, that evaluated to undefined and crashed
  // every child reading masterclassCourse.currentModule. A loading-state
  // placeholder fixes the crash without waiting on real data to render.
  const masterclassCourse = courses[0] || {
    id: 'loading', title: 'TNPSC Group 2 Adaptive Learning', category: 'Loading curriculum', track: 'TNPSC Group 2 & 2A',
    currentModule: 'Adaptive Plan', totalModules: 1, completedModules: 0, progress: 0,
    description: 'Loading your real learning plan…', thumbnailTag: 'TNPSC Group 2',
    accentColor: '#ea580c', isBookmarked: false, lessons: [],
  };
  const unreadCount = notifications.filter((n) => n.unread).length;
  const uncompletedUnitsCount = todayUnits.filter((u) => u.status !== 'COMPLETED').length;

  const showSnackbar = (text: string, type: SnackbarMessage['type'] = 'success', actionLabel?: string, onAction?: () => void) => {
    setSnackbar({
      id: `snack-${Date.now()}`,
      text,
      type,
      actionLabel,
      onAction,
    });
  };

  const handleTabChange = (tab: AndroidTabKey) => {
    setActiveTab(tab);
    setSubView(null);
  };

  const handleDrawerSelectView = (view: string) => {
    if (view === 'home') {
      setActiveTab('today');
      setSubView(null);
    } else if (view === 'courses') {
      setActiveTab('courses');
      setSubView(null);
    } else if (view === 'practise' || view === 'pyqs' || view === 'quicklab' || view === 'mistakes') {
      setActiveTab('practice');
      setSubView(view);
    } else if (view === 'tests') {
      setActiveTab('tests');
      setSubView(null);
    } else {
      setSubView(view);
    }
  };

  const handleLog30Min = () => {
    onLogGoalProgress(30);
    showSnackbar('Logged +30m study time! Daily target updated.', 'xp');
  };

  const handleUnitToggleWithToast = (id: string) => {
    onToggleTodayUnit(id);
    const unit = todayUnits.find((u) => u.id === id);
    if (unit && unit.status !== 'COMPLETED') {
      showSnackbar(`Completed: ${unit.title}! +30 XP`, 'xp');
    }
  };

  // Screen title based on state
  const screenTitle = subView
    ? subView.charAt(0).toUpperCase() + subView.slice(1)
    : activeTab === 'today'
    ? "Today's Plan"
    : activeTab === 'courses'
    ? 'Courses & Syllabus'
    : activeTab === 'practice'
    ? 'Practice & PYQs'
    : activeTab === 'tests'
    ? 'Supervised Mocks'
    : 'Aspirant Progress';

  // The inner content of the Android app
  const renderAndroidContent = () => {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-neutral-50 dark:bg-neutral-950 transition-colors">
        {/* Android Status Bar */}
        <AndroidStatusBar isDarkMode={isDarkMode} />

        {/* PWA Install Banner */}
        <AndroidInstallBanner />

        {/* Android Top App Bar */}
        <AndroidTopBar
          title={screenTitle}
          subtitle="TNPSC Group 2 & 2A"
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onOpenNotifications={onOpenNotifications}
          unreadCount={unreadCount}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          onOpenAdminPortal={onOpenAdminPortal}
          viewMode={viewMode}
          onChangeViewMode={onChangeViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Android Navigation Drawer */}
        <AndroidDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          profile={profile}
          currentView={subView || activeTab}
          onSelectView={handleDrawerSelectView}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          onOpenAdminPortal={onOpenAdminPortal}
          onOpenNotifications={onOpenNotifications}
          unreadCount={unreadCount}
        />

        {/* Android Main Scrollable Screen Content */}
        <main className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 pb-24">
          {/* TAB 1: TODAY'S SCHEDULE & LEARNING QUEUE */}
          {activeTab === 'today' && !subView && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Quick Sprint / Daily Goal Pill Bar */}
              <div className="flex items-center justify-between rounded-2xl bg-linear-to-r from-orange-500 via-amber-500 to-orange-600 p-4 text-white shadow-md">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-100">
                    Syllabus Sprint · Day 14
                  </span>
                  <h3 className="text-sm font-bold mt-0.5">1.5 / 2.0 hrs studied today</h3>
                  <p className="text-[11px] text-white/90">0.5 hrs left to achieve daily target</p>
                </div>
                <button
                  onClick={handleLog30Min}
                  className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-orange-950 shadow-xs hover:bg-neutral-100 active:scale-95 transition-all cursor-pointer"
                >
                  Log +30m
                </button>
              </div>

              {/* Continue Learning Split Hero Card */}
              <ContinueLearningCard
                course={masterclassCourse}
                onResume={() => onOpenCourseModal(masterclassCourse)}
                onToggleBookmark={onToggleBookmark}
              />

              {/* Today's Adaptive Learning Queue */}
              <TodayLearningQueue
                units={todayUnits}
                onToggleUnit={handleUnitToggleWithToast}
                onLaunchUnit={onLaunchTodayUnit}
              />

              {/* Subject Mastery Assessment Card */}
              <SubjectMasteryCard subjects={subjectMastery} />

              {/* Focus Weak Areas & Remediation */}
              <WeakAreasCard
                weakAreas={weakAreas}
                onPracticeTopic={(t) => {
                  onPracticeTopic(t);
                  showSnackbar(`Generated 15 adaptive MCQs for ${t}!`, 'info');
                }}
              />

              {/* Learning Activity Heatmap */}
              <LearningActivityHeatmap activities={activities} />
            </div>
          )}

          {/* TAB 2: COURSES & SYLLABUS HIERARCHY */}
          {activeTab === 'courses' && !subView && (
            <div className="animate-in fade-in duration-200">
              <CoursesView
                courses={structuredCourses}
                onUpdateLessonStep={(cId, lId, step, comp) => {
                  onUpdateLessonStep(cId, lId, step, comp);
                  if (comp) {
                    showSnackbar('Completed lesson step! +25 XP', 'xp');
                  }
                }}
                onAddXp={(amount) => showSnackbar(`Earned +${amount} XP!`, 'xp')}
                onSwitchToTodayPlan={() => setActiveTab('today')}
                onCompleteModule={(cId, mId) => {
                  onCompleteModule(cId, mId);
                  showSnackbar('Module completed! Unlocked Milestone Badge +200 XP', 'xp');
                }}
                onOpenNotifications={onOpenNotifications}
              />
            </div>
          )}

          {/* TAB 3: PRACTICE, PYQS & QUICK LAB */}
          {activeTab === 'practice' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Practice Sub-Navigation Tabs */}
              <div className="flex rounded-xl bg-neutral-200/70 p-1 dark:bg-neutral-800 text-xs font-semibold overflow-x-auto">
                <button
                  onClick={() => setSubView(null)}
                  className={`flex-1 rounded-lg py-1.5 px-3 transition-all cursor-pointer whitespace-nowrap text-center ${
                    !subView
                      ? 'bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-white font-bold'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  MCQs ({practiceQuestions.length})
                </button>
                <button
                  onClick={() => setSubView('pyqs')}
                  className={`flex-1 rounded-lg py-1.5 px-3 transition-all cursor-pointer whitespace-nowrap text-center ${
                    subView === 'pyqs'
                      ? 'bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-white font-bold'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  PYQs (2022-24)
                </button>
                <button
                  onClick={() => setSubView('quicklab')}
                  className={`flex-1 rounded-lg py-1.5 px-3 transition-all cursor-pointer whitespace-nowrap text-center ${
                    subView === 'quicklab'
                      ? 'bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-white font-bold'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  Quick Lab
                </button>
                <button
                  onClick={() => setSubView('mistakes')}
                  className={`flex-1 rounded-lg py-1.5 px-3 transition-all cursor-pointer whitespace-nowrap text-center ${
                    subView === 'mistakes'
                      ? 'bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-white font-bold'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  Mistakes ({mistakes.length})
                </button>
              </div>

              {!subView && (
                <PracticeView
                  questions={practiceQuestions}
                  onAddXp={(amount) => {
                    onAddXp?.(amount);
                    showSnackbar(`Earned +${amount} XP!`, 'xp');
                  }}
                />
              )}
              {subView === 'pyqs' && (
                <PYQView
                  pyqs={pyqs}
                  onAddXp={(amount) => {
                    onAddXp?.(amount);
                    showSnackbar(`Earned +${amount} XP!`, 'xp');
                  }}
                />
              )}
              {subView === 'quicklab' && (
                <QuickLabView
                  onAddXp={(amount) => {
                    onAddXp?.(amount);
                    showSnackbar(`Quick Lab completed! +${amount} XP`, 'xp');
                  }}
                />
              )}
              {subView === 'mistakes' && (
                <MistakesView
                  mistakes={mistakes}
                  onAddXp={(amount) => {
                    onAddXp?.(amount);
                    showSnackbar(`Mistake resolved! +${amount} XP`, 'xp');
                  }}
                />
              )}
            </div>
          )}

          {/* TAB 4: SUPERVISED MOCKS & PROCTORING */}
          {activeTab === 'tests' && !subView && (
            <div className="animate-in fade-in duration-200">
              <TestsView
                tests={tests}
                onAddXp={(amount) => {
                  onAddXp?.(amount);
                  showSnackbar(`Test completed! +${amount} XP`, 'xp');
                }}
              />
            </div>
          )}

          {/* TAB 5: PROGRESS, MASTERY & ADMIN CONTROL PLANE */}
          {activeTab === 'profile' && !subView && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <ProgressPanel
                profile={profile}
                onOpenProfile={onOpenProfile}
                onUpdateDailyGoal={onUpdateDailyGoal}
                onLogGoalProgress={(mins) => {
                  onLogGoalProgress(mins);
                  showSnackbar(`Logged +${mins}m study time!`, 'xp');
                }}
              />

              {/* Launch NOVA Admin Panel Card */}
              <div className="rounded-3xl border border-orange-200 bg-linear-to-br from-orange-50 via-white to-amber-50 p-6 dark:border-orange-900/60 dark:from-neutral-900 dark:via-neutral-900 dark:to-orange-950/20 shadow-xs space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-xs">
                    🛡️
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      NOVA Admin Control Plane
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Access all 33 sections, role simulation & proctoring test suite
                    </p>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Operate curriculum CRUD, learner suspensions, MCQ review queue, proctoring cockpit, and run the 42-rule acceptance test suite.
                </p>

                <button
                  onClick={onOpenAdminPortal}
                  className="w-full rounded-2xl bg-orange-500 py-3 text-xs font-bold text-white shadow-sm hover:bg-orange-600 active:scale-98 transition-all cursor-pointer"
                >
                  Launch Full NOVA Admin Panel →
                </button>
              </div>

              {/* Journey Map Link */}
              <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                    7-Phase Curriculum Journey
                  </h4>
                  <p className="text-xs text-neutral-500">View complete roadmap to TNPSC rank</p>
                </div>
                <button
                  onClick={() => setSubView('journey')}
                  className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
                >
                  View Map
                </button>
              </div>
            </div>
          )}

          {/* Sub-Views */}
          {subView === 'journey' && <JourneyView />}
          {subView === 'notes' && (
            <NotesView
              notes={notes}
              onAddNote={onAddNote || (() => {})}
              onDeleteNote={onDeleteNote || (() => {})}
            />
          )}
          {subView === 'bookmarks' && (
            <BookmarksView
              courses={courses}
              onResumeCourse={onOpenCourseModal}
              onToggleBookmark={onToggleBookmark}
            />
          )}
        </main>

        {/* Android Material 3 Bottom Navigation Bar */}
        <AndroidBottomNav
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          unreadTestsCount={1}
          uncompletedUnitsCount={uncompletedUnitsCount}
        />

        {/* Android Snackbar Toast */}
        <AndroidSnackbar message={snackbar} onDismiss={() => setSnackbar(null)} />
      </div>
    );
  };

  // IF DEVICE FRAME VIEW MODE IS SELECTED: Render inside realistic Pixel 8 Pro mockup shell!
  if (viewMode === 'device') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-2 sm:p-6 select-none">
        {/* Pixel 8 Pro Device Shell */}
        <div className="relative flex flex-col w-full max-w-[420px] h-[890px] max-h-[96vh] rounded-[48px] bg-neutral-900 p-3 shadow-2xl ring-12 ring-neutral-800 border-4 border-neutral-700 overflow-hidden">
          {/* Subtle phone speaker & antenna accents */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1 w-14 rounded-full bg-neutral-800" />

          {/* Screen Display Container */}
          <div className="relative flex flex-1 flex-col rounded-[38px] overflow-hidden bg-neutral-50 dark:bg-neutral-950">
            {renderAndroidContent()}
          </div>
        </div>
      </div>
    );
  }

  // NATIVE MOBILE / RESPONSIVE EDGE-TO-EDGE VIEW MODE
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-lg min-h-screen flex flex-col shadow-2xl border-x border-neutral-200/60 dark:border-neutral-800/60">
        {renderAndroidContent()}
      </div>
    </div>
  );
};
