import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TopCards } from './components/TopCards';
import { ContinueLearningCard } from './components/ContinueLearningCard';
import { LearningActivityHeatmap } from './components/LearningActivityHeatmap';
import { ProgressPanel } from './components/ProgressPanel';
import { CourseModal } from './components/CourseModal';
import { NotesView } from './components/NotesView';
import { PracticeView } from './components/PracticeView';
import { QuickLabView } from './components/QuickLabView';
import { ResourcesView } from './components/ResourcesView';
import { BookmarksView } from './components/BookmarksView';
import { ProfileModal } from './components/ProfileModal';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthModal } from './components/AuthModal';
import { TodayLearningQueue } from './components/TodayLearningQueue';
import { SubjectMasteryCard } from './components/SubjectMasteryCard';
import { WeakAreasCard } from './components/WeakAreasCard';
import { PYQView } from './components/PYQView';
import { MistakesView } from './components/MistakesView';
import { JourneyView } from './components/JourneyView';
import { TestsView } from './components/TestsView';
import { CoursesView } from './components/CoursesView';
import { AdminPortal } from './components/admin/AdminPortal';
import { resources } from './data/resources';
import { useAppData } from './hooks/useAppData';

export default function App() {
  const {
    profile, courses, notes, todayUnits, subjectMastery, weakAreas, practiceQuestions, pyqs, mistakes,
    uploadedResources, tests, structuredCourses, notifications, achievements, activities,
    isDataLoading, dataError, dashboardSnapshot, curriculumProgress, activeCurriculum, quickLabStats,
    isDarkMode, isLoggedIn, session, isAuthModalOpen, authMode, isOnboardingOpen, currentView, activeCourseModal,
    isProfileModalOpen, themeToast, isGlowActive, masterclassCourse, totalBookmarks, isAdminSession,
    setCurrentView, setActiveCourseModal, setIsProfileModalOpen, setIsAuthModalOpen, setIsOnboardingOpen,
    toggleDarkMode,
    handleMarkNotificationRead, handleMarkAllNotificationsRead, handleClearAllNotifications,
    handleUpdateStructuredLessonStep, handleToggleBookmark, handleToggleLesson, handleUpdateDailyGoal,
    handleLogGoalProgress, handleAddXp, handleAddNote, handleDeleteNote, handleToggleTodayUnit, handleLaunchTodayUnit,
    handlePracticeTopic, handlePracticeAnswer, handlePracticeMistake, handlePyqAnswer, handleBookmarkQuestion,
    handleOpenAuth, handleLogout, handleLoginSuccess, handleCompleteOnboarding, handleUpdateProfile,
  } = useAppData();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (currentView === 'admin' && isAdminSession) {
    return (
      <AdminPortal
        onReturnToLearnerHub={() => setCurrentView('home')}
        initialRole={session?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN'}
      />
    );
  }

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-200 ${
        isDarkMode ? 'bg-neutral-900 text-neutral-100' : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      <div className="flex min-h-screen">
        {/* Left Sidebar matching wireframe */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          bookmarkCount={totalBookmarks}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          profile={profile}
          isLoggedIn={isLoggedIn}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          isAdminSession={isAdminSession}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top Header Bar */}
          <Header
            profile={profile}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoggedIn={isLoggedIn}
            onOpenAuth={handleOpenAuth}
            onLogout={handleLogout}
            notifications={notifications}
            onMarkAsRead={handleMarkNotificationRead}
            onMarkAllAsRead={handleMarkAllNotificationsRead}
            onClearAll={handleClearAllNotifications}
            onNavigateTo={(view) => setCurrentView(view)}
          />

          {/* Main Body View */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {/* HOME VIEW: Replicates the Wireframe Layout with Image 2 Content */}
            {currentView === 'home' && (
              <div className="space-y-6">
                {/* Search Results filter if user searches */}
                {searchQuery ? (
                  <div className="space-y-4">
                    <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                      Search results for "{searchQuery}"
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {courses
                        .filter(
                          (c) =>
                            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.description.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((c) => (
                          <div
                            key={c.id}
                            className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800"
                          >
                            <span className="text-xs font-semibold text-orange-600">
                              {c.category}
                            </span>
                            <h3 className="font-bold text-neutral-900 dark:text-white">
                              {c.title}
                            </h3>
                            <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
                              {c.description}
                            </p>
                            <button
                              onClick={() => setActiveCourseModal(c)}
                              className="mt-3 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white"
                            >
                              Open Course
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                    {/* Center Column: Top Cards, Continue Learning Card, Queue, Heatmap, Mastery, Weak Areas */}
                    <div className="space-y-6 xl:col-span-8">
                      {/* Top 3 Cards from wireframe sketch */}
                      <TopCards
                        course={masterclassCourse}
                        profile={profile}
                        dashboard={dashboardSnapshot}
                        quickLabStats={quickLabStats}
                        onResumeCourse={() => setActiveCourseModal(masterclassCourse)}
                        onOpenQuickLab={() => setCurrentView('quicklab')}
                      />

                      {/* Continue Learning Split Hero Card (Matches Image 2 exactly) */}
                      <ContinueLearningCard
                        course={masterclassCourse}
                        onResume={() => setActiveCourseModal(masterclassCourse)}
                        onToggleBookmark={handleToggleBookmark}
                      />

                      {/* Today's Learning Queue */}
                      <TodayLearningQueue
                        units={todayUnits}
                        onToggleUnit={handleToggleTodayUnit}
                        onLaunchUnit={handleLaunchTodayUnit}
                        curriculumContext={curriculumProgress?.current ? {
                          phaseName: curriculumProgress.current.phase_name || curriculumProgress?.phases?.find((phase: any) => phase.id === curriculumProgress.current.current_phase_id)?.name,
                          weekNumber: Number(curriculumProgress.current.week_number || profile.currentWeek),
                          dayNumber: Number(curriculumProgress.current.day_number || profile.currentDay),
                        } : {
                          phaseName: profile.currentPhase,
                          weekNumber: profile.currentWeek,
                          dayNumber: profile.currentDay,
                        }}
                      />

                      {/* Learning Activity Heatmap (Matches Image 2 exactly) */}
                      <LearningActivityHeatmap activities={activities} />

                      {/* Subject Mastery Grid */}
                      <SubjectMasteryCard subjects={subjectMastery} />

                      {/* Focus & Remediation Weak Areas */}
                      <WeakAreasCard
                        weakAreas={weakAreas}
                        onPracticeTopic={handlePracticeTopic}
                      />
                    </div>

                    {/* Right Column: Progress Panel from wireframe sketch */}
                    <div className="xl:col-span-4">
                      <div className="sticky top-20">
                        <ProgressPanel
                          profile={profile}
                          subjects={subjectMastery}
                          achievements={achievements}
                          onOpenProfile={() => setIsProfileModalOpen(true)}
                          onUpdateDailyGoal={handleUpdateDailyGoal}
                          onLogGoalProgress={handleLogGoalProgress}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STRUCTURED SUBJECT COURSES & COMPLETION VIEW */}
            {currentView === 'courses' && (
              <CoursesView
                courses={structuredCourses}
                onUpdateLessonStep={handleUpdateStructuredLessonStep}
                onAddXp={handleAddXp}
                onSwitchToTodayPlan={() => setCurrentView('home')}
              />
            )}

            {/* BOOKMARKS VIEW */}
            {currentView === 'bookmarks' && (
              <BookmarksView
                courses={courses}
                onResumeCourse={(c) => setActiveCourseModal(c)}
                onToggleBookmark={handleToggleBookmark}
              />
            )}

            {/* LEARN -> NOTES VIEW */}
            {currentView === 'notes' && (
              <NotesView
                notes={notes}
                defaultCourseTitle={masterclassCourse.title}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
              />
            )}

            {/* LEARN -> PRACTISE VIEW */}
            {currentView === 'practise' && (
              practiceQuestions.length > 0 ? (
                <PracticeView questions={practiceQuestions} onAddXp={handleAddXp} onSubmitAnswer={handlePracticeAnswer} />
              ) : (
                <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
                  No practice question is currently available from the learning engine.
                </div>
              )
            )}

            {/* LEARN -> QUICK LAB VIEW */}
            {currentView === 'quicklab' && (
              <QuickLabView profile={profile} onAddXp={handleAddXp} />
            )}

            {/* EXAM HUB -> PYQs VIEW */}
            {currentView === 'pyqs' && (
              <PYQView pyqs={pyqs} onAddXp={handleAddXp} onSubmitAnswer={handlePyqAnswer} onBookmark={handleBookmarkQuestion} />
            )}

            {/* EXAM HUB -> TESTS VIEW */}
            {currentView === 'tests' && (
              <TestsView tests={tests} onAddXp={handleAddXp} />
            )}

            {/* EXAM HUB -> JOURNEY ROADMAP VIEW */}
            {currentView === 'journey' && (
              <JourneyView progress={curriculumProgress} active={activeCurriculum?.current} />
            )}

            {/* EXAM HUB -> MISTAKE ENGINE VIEW */}
            {currentView === 'mistakes' && (
              <MistakesView mistakes={mistakes} onPractice={handlePracticeMistake} />
            )}

            {/* RESOURCES -> LINKS VIEW */}
            {currentView === 'resources-links' && (
              <ResourcesView resources={[...resources, ...uploadedResources]} defaultTab="links" />
            )}

            {/* RESOURCES -> DOWNLOAD VIEW */}
            {currentView === 'resources-download' && (
              <ResourcesView resources={[...resources, ...uploadedResources]} defaultTab="download" />
            )}
          </main>
        </div>
      </div>

      {/* Interactive Course Player / Masterclass Modal */}
      {activeCourseModal && (
        <CourseModal
          course={activeCourseModal}
          isOpen={Boolean(activeCourseModal)}
          onClose={() => setActiveCourseModal(null)}
          onToggleLesson={handleToggleLesson}
          onAddXp={handleAddXp}
        />
      )}

      {/* Student Profile & Settings Modal */}
      <ProfileModal
        profile={profile}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdateProfile={handleUpdateProfile}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      {/* Auth Modal (Sign In / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authMode}
      />

      {/* Diagnostic & Profile Setup Wizard */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        profile={profile}
        onComplete={handleCompleteOnboarding}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {isDataLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-neutral-950/70" role="status" aria-live="polite">
          <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-center shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-neutral-200 border-t-orange-500" />
            <p className="mt-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200">Syncing your learning hub…</p>
            <p className="mt-1 text-[10px] text-neutral-400">Loading real curriculum, progress and recommendations</p>
          </div>
        </div>
      )}

      {dataError && !isDataLoading && (
        <div className="fixed bottom-5 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-xl dark:border-red-900 dark:bg-neutral-900" role="alert">
          <div className="min-w-0"><p className="text-xs font-semibold text-red-700 dark:text-red-300">We couldn't sync all learning data.</p><p className="mt-0.5 truncate text-[10px] text-neutral-500">{dataError}</p></div>
          <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-bold text-white">Retry</button>
        </div>
      )}

      {/* Subtle Ambient Glow Transition Overlay */}
      {isGlowActive && (
        <div
          className={`pointer-events-none fixed inset-0 z-50 animate-theme-glow mix-blend-screen transition-opacity ${
            isDarkMode
              ? 'bg-radial from-orange-500/10 via-transparent to-transparent'
              : 'bg-radial from-amber-200/20 via-transparent to-transparent'
          }`}
          aria-hidden="true"
        />
      )}

      {/* Theme Toggling Visual Feedback Toast */}
      {themeToast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-neutral-200/80 bg-white/95 px-4 py-2.5 text-xs font-semibold text-neutral-800 shadow-xl backdrop-blur-md transition-all duration-300 dark:border-neutral-700/80 dark:bg-neutral-800/95 dark:text-neutral-100 animate-in fade-in slide-in-from-bottom-2"
        >
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-lg ${
              themeToast.mode === 'dark'
                ? 'bg-orange-950 text-orange-400 ring-1 ring-orange-800/60'
                : 'bg-amber-100 text-amber-600 ring-1 ring-amber-300/60'
            }`}
          >
            {themeToast.mode === 'dark' ? (
              <Moon className="h-3.5 w-3.5" />
            ) : (
              <Sun className="h-3.5 w-3.5" />
            )}
          </div>
          <span>
            {themeToast.mode === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'}
          </span>
        </div>
      )}
    </div>
  );
}
