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
import {
  generateYearActivityData,
  calculateCourseProgress,
  getUserLevelInfo,
} from './utils/learningStats';
import {
  novaApi,
  mapProfile,
  mapTodayUnits,
  mapSubjects,
  mapWeakAreas,
  buildCourseFromBackend,
  mapTests,
  mapNotifications,
  mapCalendar,
  mapBookmarks,
  mapPyq,
  mapMistake,
  mapPracticeQuestion,
  mapResources,
  mapStructuredCourses,
} from './api/novaApi';
import { updateLessonStep } from './utils/courseCompletion';
import {
  ActivityDay,
  Course,
  NoteItem,
  UserProfile,
  DailyGoal,
  TodayUnit,
  SubjectMastery,
  WeakArea,
  PYQItem,
  MistakeItem,
  PracticeQuestion,
  TestSession,
  StructuredCourse,
  StructuredLesson,
  AppNotification,
} from './types';

const EMPTY_COURSE: Course = {
  id: 'loading', title: 'TNPSC Group 2 Adaptive Learning', category: 'Loading curriculum', track: 'TNPSC Group 2 & 2A', currentModule: 'Adaptive Plan',
  totalModules: 1, completedModules: 0, progress: 0, description: 'Loading your real learning plan…', thumbnailTag: 'TNPSC Group 2',
  accentColor: '#ea580c', isBookmarked: false, lessons: [],
};

export default function App() {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Learner', handle: '@learner', avatarText: 'L', exam: 'TNPSC Group 2', level: 'Beginner', currentPhase: 'Orientation',
    currentWeek: 1, currentDay: 1, xp: 0, nextLevelXp: 1000, streakDays: 0, hoursSpent: 0, completedLabs: 0, certificates: 0,
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [todayUnits, setTodayUnits] = useState<TodayUnit[]>([]);
  const [subjectMastery, setSubjectMastery] = useState<SubjectMastery[]>([]);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [pyqs, setPyqs] = useState<PYQItem[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [uploadedResources, setUploadedResources] = useState<ReturnType<typeof mapResources>>([]);
  const [mistakeQuestion, setMistakeQuestion] = useState<ReturnType<typeof mapPracticeQuestion>>(null);
  const [tests, setTests] = useState<TestSession[]>([]);
  const [structuredCourses, setStructuredCourses] = useState<StructuredCourse[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [achievements, setAchievements] = useState<Array<{ id: string; name: string; icon?: string; unlocked: boolean }>>([]);
  const [activities, setActivities] = useState<ActivityDay[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dashboardSnapshot, setDashboardSnapshot] = useState<any>(null);
  const [curriculumTree, setCurriculumTree] = useState<any>(null);
  const [activeCurriculum, setActiveCurriculum] = useState<any>(null);
  const [curriculumProgress, setCurriculumProgress] = useState<any>(null);
  const [quickLabStats, setQuickLabStats] = useState<any>({ attempts: 0, correct: 0, accuracy: 0 });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (localStorage.getItem('yash_dark_mode') || localStorage.getItem('nova_dark_mode')) === 'true';
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setSession] = useState<{ email: string; role: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const [currentView, setCurrentView] = useState<string>('home');
  const [activeCourseModal, setActiveCourseModal] = useState<Course | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [themeToast, setThemeToast] = useState<{ visible: boolean; mode: 'dark' | 'light' } | null>(null);
  const [isGlowActive, setIsGlowActive] = useState(false);

  // Persist dark mode and sync document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('yash_dark_mode', String(isDarkMode));
    localStorage.setItem('nova_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Production data bootstrap: the ZIP UI remains the presentation layer;
  // all learner-facing data is loaded from the real YASH API/session.
  useEffect(() => {
    let cancelled = false;
    async function loadProductionData() {
      setIsDataLoading(true);
      setDataError(null);
      try {
        const me = await novaApi.me();
        if (cancelled) return;
        setIsLoggedIn(true);
        setSession(me);

        const [profileData, dashboard, courseData, plan, analytics, notificationData, achievementData, calendar, notesData, testData, bookmarkData, pyqData, mistakeData, practiceData, treeData, activeData, curriculumProgress, labStats, resourceData] = await Promise.all([
          novaApi.profile(), novaApi.dashboard(), novaApi.courses(), novaApi.plan(), novaApi.analytics(),
          novaApi.notifications(), novaApi.achievements(), novaApi.calendar(), novaApi.notes(), novaApi.tests(), novaApi.bookmarks(), novaApi.pyq(), novaApi.mistake().catch(() => null),
          novaApi.question('mixed').catch(() => null), novaApi.curriculumTree(), novaApi.activeCurriculum(), novaApi.curriculumProgress(), novaApi.quickLabStats().catch(() => ({ attempts: 0, correct: 0, accuracy: 0 })),
          novaApi.resources().catch(() => null),
        ]);
        if (cancelled) return;

        setDashboardSnapshot(dashboard);
        setCurriculumTree(treeData);
        setActiveCurriculum(activeData);
        setCurriculumProgress(curriculumProgress);
        setQuickLabStats(labStats);
        setProfile(mapProfile(profileData, dashboard));
        setIsOnboardingOpen(profileData?.onboarded === false);
        setCourses([buildCourseFromBackend(courseData, plan), ...mapBookmarks(bookmarkData)]);
        setTodayUnits(mapTodayUnits(plan));
        setSubjectMastery(mapSubjects(analytics));
        setWeakAreas(mapWeakAreas(analytics));
        setTests(mapTests(testData));
        setNotifications(mapNotifications(notificationData));
        setAchievements((achievementData?.achievements || []).map((item: any) => ({ id: item.id, name: item.name, icon: item.icon, unlocked: Boolean(item.unlocked) })));
        setActivities((dashboard?.activity?.heatmap || []).map((day: { date: string; count: number }) => {
          const count = Number(day.count || 0);
          return { date: day.date, count, level: count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4 };
        }));
        const mappedPractice = mapPracticeQuestion(practiceData || {});
        if (mappedPractice) setPracticeQuestions([mappedPractice]);
        const mappedPyq = mapPyq(pyqData);
        if (mappedPyq) setPyqs([mappedPyq]);
        if (mistakeData) {
          setMistakes(mapMistake(mistakeData));
          setMistakeQuestion(mapPracticeQuestion(mistakeData));
        }
        if (resourceData) setUploadedResources(mapResources(resourceData));
        setNotes((notesData?.notes || []) as NoteItem[]);
        // The ZIP course UI is preserved; its data is now built from the real curriculum API.
        setStructuredCourses(mapStructuredCourses(courseData));
      } catch (error) {
        if (cancelled) return;
        const status = (error as { status?: number })?.status;
        if (status === 401) {
          setIsLoggedIn(false);
          setIsAuthModalOpen(true);
        } else {
          setDataError(error instanceof Error ? error.message : 'Unable to load YASH data');
        }
      } finally {
        if (!cancelled) setIsDataLoading(false);
      }
    }
    void loadProductionData();
    return () => { cancelled = true; };
  }, []);

  const handleMarkNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    try {
      await novaApi.markNotificationRead(id);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to mark notification read');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await novaApi.markAllNotificationsRead();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to mark all notifications read');
    }
  };

  const handleClearAllNotifications = async () => {
    setNotifications([]);
    try {
      await novaApi.clearNotifications();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to clear notifications');
    }
  };

  const handleUpdateStructuredLessonStep = (
    courseId: string,
    lessonId: string,
    stepKey: keyof StructuredLesson['steps'],
    completed: boolean
  ) => {
    setStructuredCourses((prev) =>
      prev.map((course) => {
        if (course.id === courseId) {
          return updateLessonStep(course, lessonId, stepKey, completed);
        }
        return course;
      })
    );
  };

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;

    // Enable smooth global theme transition classes
    document.documentElement.classList.add('theme-transitioning');
    setIsGlowActive(true);

    const applyThemeChange = () => {
      setIsDarkMode(nextMode);
      setThemeToast({ visible: true, mode: nextMode ? 'dark' : 'light' });
    };

    // Use View Transitions API if supported for fluid circular/crossfade morph
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      try {
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
          applyThemeChange();
        });
      } catch {
        applyThemeChange();
      }
    } else {
      applyThemeChange();
    }

    // Clean up temporary transition class and glow animation
    window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
      setIsGlowActive(false);
    }, 550);

    // Auto-hide toast notification chip after 1.8 seconds
    window.setTimeout(() => {
      setThemeToast(null);
    }, 1800);
  };

  // The ZIP UI expects one active course object; the backend adapter supplies it.
  const masterclassCourse = courses[0] || EMPTY_COURSE;

  const handleToggleBookmark = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, isBookmarked: !c.isBookmarked } : c))
    );
  };

  const handleToggleLesson = (lessonId: string) => {
    setCourses((prev) =>
      prev.map((course) => {
        const hasLesson = course.lessons.some((l) => l.id === lessonId);
        if (!hasLesson) return course;

        const updatedLessons = course.lessons.map((l) =>
          l.id === lessonId ? { ...l, completed: !l.completed } : l
        );
        const newProgress = calculateCourseProgress(updatedLessons);

        const updatedCourse = {
          ...course,
          lessons: updatedLessons,
          progress: newProgress,
        };

        if (activeCourseModal && activeCourseModal.id === course.id) {
          setActiveCourseModal(updatedCourse);
        }

        return updatedCourse;
      })
    );

    // Bump today's activity count in heatmap
    setActivities((prev) => {
      const copy = [...prev];
      if (copy.length > 0) {
        const last = { ...copy[copy.length - 1] };
        last.count += 1;
        last.level = Math.min(4, last.level + 1);
        copy[copy.length - 1] = last;
      }
      return copy;
    });

    // If daily goal is lessons and lesson was completed, bump daily goal count
    setProfile((prev) => {
      if (prev.dailyGoal && prev.dailyGoal.type === 'lessons') {
        return {
          ...prev,
          dailyGoal: {
            ...prev.dailyGoal,
            current: prev.dailyGoal.current + 1,
          },
        };
      }
      return prev;
    });
  };

  const handleUpdateDailyGoal = async (dailyGoal: DailyGoal) => {
    try {
      await novaApi.saveOnboardingPreferences({ dailyGoalMinutes: Math.round(dailyGoal.target * 60) });
      setProfile((prev) => ({ ...prev, dailyGoal }));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to save daily goal');
    }
  };

  const handleLogGoalProgress = async (amount: number) => {
    if (!amount || amount <= 0) return;
    try {
      await novaApi.logStudyTime(Math.round(amount * 60));
      setProfile((prev) => {
        const existing = prev.dailyGoal || { type: 'hours', target: 0.5, current: 0 };
        return { ...prev, hoursSpent: Number((prev.hoursSpent + amount).toFixed(1)), dailyGoal: { ...existing, current: Number((existing.current + amount).toFixed(1)) } };
      });
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to log study time');
    }
  };

  const handleAddXp = (amount: number) => {
    setProfile((prev) => {
      const newXp = prev.xp + amount;
      const levelInfo = getUserLevelInfo(newXp);
      return {
        ...prev,
        xp: newXp,
        level: levelInfo.level,
      };
    });
  };

  const handleAddNote = async (newNoteData: Omit<NoteItem, 'id' | 'date'>) => {
    try {
      const result = await novaApi.addNote(newNoteData);
      if (result?.note) setNotes((prev) => [result.note as NoteItem, ...prev]);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to save note');
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await novaApi.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to delete note');
    }
  };

  const handleToggleTodayUnit = async (unitId: string) => {
    const unit = todayUnits.find((item) => item.id === unitId);
    if (!unit || unit.status === 'COMPLETED') return;
    if (!unit.unitId) {
      setDataError('This adaptive activity is not linked to a curriculum unit yet.');
      return;
    }
    try {
      await novaApi.completeCurriculumUnit(unit.unitId);
      setTodayUnits((prev) => prev.map((item) => item.id === unitId ? { ...item, status: 'COMPLETED' } : item));
      handleAddXp(50);
      setActivities((act) => {
        const copy = [...act];
        if (copy.length > 0) {
          const last = { ...copy[copy.length - 1] };
          last.count += 1;
          last.level = Math.min(4, last.level + 1);
          copy[copy.length - 1] = last;
        }
        return copy;
      });
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to complete learning activity');
    }
  };

  const handleLaunchTodayUnit = async (unit: TodayUnit) => {
    if (unit.topicId) {
      try {
        await novaApi.startIntervention({ topicId: unit.topicId, action: unit.type });
      } catch (error) {
        setDataError(error instanceof Error ? error.message : 'Unable to start adaptive intervention');
      }
    }
    if (unit.type === 'LESSON') {
      setActiveCourseModal(masterclassCourse);
    } else if (unit.type === 'PYQ') {
      setCurrentView('pyqs');
    } else if (unit.type === 'REMEDIATION') {
      setCurrentView('mistakes');
    } else if (unit.type === 'TEST') {
      setCurrentView('tests');
    } else {
      setCurrentView('practise');
    }
  };
  const handlePracticeTopic = (_topic: string) => {
    setCurrentView('practise');
  };

  const handlePracticeAnswer = async (question: PracticeQuestion, selectedIndex: number, timeTakenMs: number) => {
    const result = await novaApi.attempt({ attemptId: crypto.randomUUID(), questionId: question.id, selectedIndex, timeTakenMs, mode: 'PRACTICE' });
    if (result.correct && mistakes.some((m) => m.id === question.id)) {
      const refreshed = await novaApi.mistake().catch(() => null);
      setMistakes(refreshed ? mapMistake(refreshed) : []);
      setMistakeQuestion(refreshed ? mapPracticeQuestion(refreshed) : null);
    }
    return { correct: Boolean(result.correct), correctIndex: Number(result.correctIndex), explanation: result.explanation || question.explanation };
  };

  const handlePracticeMistake = () => {
    if (mistakeQuestion) setPracticeQuestions([mistakeQuestion]);
    setCurrentView('practise');
  };

  const handlePyqAnswer = async (question: PYQItem, selectedIndex: number, timeTakenMs: number) => {
    const result = await novaApi.attempt({ attemptId: crypto.randomUUID(), questionId: question.id, selectedIndex, timeTakenMs, mode: 'PRACTICE' });
    return { correct: Boolean(result.correct), correctIndex: Number(result.correctIndex), explanation: result.explanation || question.explanation };
  };

  const handleBookmarkQuestion = async (questionId: string) => {
    await novaApi.bookmark(questionId);
  };

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try { await novaApi.logout(); } catch { /* session may already be expired */ }
    setIsLoggedIn(false);
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (_user: {
    name: string;
    email: string;
    phone?: string;
    isNewUser: boolean;
  }) => {
    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
    window.location.reload();
  };

  const handleCompleteOnboarding = async (data: {
    profile: Partial<UserProfile>;
    updatedMastery?: SubjectMastery[];
    updatedWeakAreas?: WeakArea[];
  }) => {
    try {
      await novaApi.saveOnboardingPreferences({
        name: data.profile.name,
        phone: data.profile.phone,
        dailyGoalMinutes: Math.round((profile.dailyGoal?.target || 0.5) * 60),
      });
      setProfile((prev) => ({ ...prev, ...data.profile }));
      setIsOnboardingOpen(false);
      window.location.reload();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to save onboarding preferences');
    }
  };

  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...updated,
    }));
    try {
      await novaApi.updateProfile({
        name: updated.name,
        phone: updated.phone,
        emailNotifications: updated.emailNotifications,
        smsNotifications: updated.smsNotifications,
      });
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to save profile');
    }
  };

  const totalBookmarks = courses.filter((c) => c.isBookmarked).length;
  const isAdminSession = session?.role === 'ADMIN' || session?.role === 'SUPER_ADMIN';

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
