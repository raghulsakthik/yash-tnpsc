import React from 'react';
import { AndroidAppShell } from './components/android/AndroidAppShell';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { CourseModal } from './components/CourseModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AdminPortal } from '../components/admin/AdminPortal';
import { OnboardingModal } from '../components/OnboardingModal';
import { useAppData } from '../hooks/useAppData';

/**
 * Entry point for the native Android build (wrapped via Capacitor --
 * see capacitor.config.ts). Renders the dedicated Android-designed shell
 * (AndroidAppShell + its phone chrome: status bar, top bar, bottom nav,
 * drawer, snackbar) imported verbatim from the design package, wired to
 * the exact same real backend as the web app via useAppData() -- the same
 * hook src/App.tsx (the desktop/browser entry) uses, so this is the same
 * production data and the same write-paths, just a different, Android-
 * specific presentation layer on top. The design itself is untouched: no
 * file under android-app/components was edited beyond fixing relative
 * import paths after repackaging.
 */
export default function AndroidApp() {
  const {
    profile, courses, notes, todayUnits, subjectMastery, weakAreas, practiceQuestions, pyqs, mistakes,
    uploadedResources, tests, structuredCourses, notifications, activities,
    isDataLoading, dataError, isDarkMode, isLoggedIn, session, isAuthModalOpen, authMode, isOnboardingOpen,
    currentView, activeCourseModal, isProfileModalOpen, masterclassCourse, isAdminSession,
    setCurrentView, setActiveCourseModal, setIsProfileModalOpen, setIsAuthModalOpen, setIsOnboardingOpen,
    toggleDarkMode,
    handleMarkNotificationRead, handleMarkAllNotificationsRead, handleClearAllNotifications,
    handleUpdateStructuredLessonStep, handleToggleBookmark, handleToggleLesson, handleUpdateDailyGoal,
    handleLogGoalProgress, handleAddXp, handleAddNote, handleDeleteNote, handleToggleTodayUnit, handleLaunchTodayUnit,
    handlePracticeTopic, handleOpenAuth, handleLogout, handleLoginSuccess, handleCompleteOnboarding, handleUpdateProfile,
  } = useAppData();

  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = React.useState(false);

  if (currentView === 'admin' && isAdminSession) {
    return (
      <AdminPortal
        onReturnToLearnerHub={() => setCurrentView('home')}
        initialRole={session?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN'}
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <AuthModal
        isOpen={true}
        onClose={() => {}}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authMode}
      />
    );
  }

  return (
    <>
      <AndroidAppShell
        profile={profile}
        courses={courses}
        structuredCourses={structuredCourses}
        todayUnits={todayUnits}
        subjectMastery={subjectMastery}
        weakAreas={weakAreas}
        activities={activities}
        notifications={notifications}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenAdminPortal={() => setCurrentView('admin')}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onToggleTodayUnit={handleToggleTodayUnit}
        onLaunchTodayUnit={handleLaunchTodayUnit}
        onUpdateLessonStep={handleUpdateStructuredLessonStep}
        onCompleteModule={() => {}}
        onPracticeTopic={handlePracticeTopic}
        onUpdateDailyGoal={handleUpdateDailyGoal}
        onLogGoalProgress={handleLogGoalProgress}
        onToggleBookmark={handleToggleBookmark}
        practiceQuestions={practiceQuestions}
        notes={notes}
        resources={uploadedResources}
        pyqs={pyqs}
        mistakes={mistakes}
        tests={tests}
        onOpenCourseModal={(course) => setActiveCourseModal(course)}
        onAddXp={handleAddXp}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        viewMode="mobile"
        onChangeViewMode={() => {}}
      />

      {activeCourseModal && (
        <CourseModal
          course={activeCourseModal}
          isOpen={Boolean(activeCourseModal)}
          onClose={() => setActiveCourseModal(null)}
          onToggleLesson={handleToggleLesson}
          onAddXp={handleAddXp}
        />
      )}

      <ProfileModal
        profile={profile}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdateProfile={handleUpdateProfile}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationRead}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onClearAll={handleClearAllNotifications}
        onNavigateTo={(view) => { setCurrentView(view); setIsNotificationDrawerOpen(false); }}
      />

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
          </div>
        </div>
      )}

      {dataError && !isDataLoading && (
        <div className="fixed bottom-24 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-xl dark:border-red-900 dark:bg-neutral-900" role="alert">
          <div className="min-w-0"><p className="text-xs font-semibold text-red-700 dark:text-red-300">We couldn't sync all learning data.</p><p className="mt-0.5 truncate text-[10px] text-neutral-500">{dataError}</p></div>
          <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-bold text-white">Retry</button>
        </div>
      )}
    </>
  );
}
