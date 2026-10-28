import { useEffect, useState } from 'react';
import {
  novaApi,
  mapProfile,
  mapTodayUnits,
  mapSubjects,
  mapWeakAreas,
  buildCourseFromBackend,
  mapTests,
  mapNotifications,
  mapBookmarks,
  mapPyq,
  mapMistake,
  mapPracticeQuestion,
  mapResources,
  mapStructuredCourses,
} from '../api/novaApi';
import { calculateCourseProgress, getUserLevelInfo } from '../utils/learningStats';
import { updateLessonStep } from '../utils/courseCompletion';
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
} from '../types';

const EMPTY_COURSE: Course = {
  id: 'loading', title: 'TNPSC Group 2 Adaptive Learning', category: 'Loading curriculum', track: 'TNPSC Group 2 & 2A', currentModule: 'Adaptive Plan',
  totalModules: 1, completedModules: 0, progress: 0, description: 'Loading your real learning plan…', thumbnailTag: 'TNPSC Group 2',
  accentColor: '#ea580c', isBookmarked: false, lessons: [],
};

/**
 * All real data-fetching, state and backend-wired handlers for the
 * learner-facing app -- extracted out of App.tsx (the desktop/web entry)
 * so the Android entry (android-app/App.tsx, rendering AndroidAppShell
 * instead of the desktop Sidebar/Header layout) can share the exact same
 * real backend wiring instead of re-implementing it. Every call here goes
 * to the same production API both entry points already use; nothing here
 * changes behavior for the existing desktop app, this is a pure extraction.
 */
export function useAppData() {
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

        const [profileData, dashboard, courseData, plan, analytics, notificationData, achievementData, , notesData, testData, bookmarkData, pyqData, mistakeData, practiceData, treeData, activeData, curriculumProgress, labStats, resourceData] = await Promise.all([
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
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
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
      prev.map((course) => (course.id === courseId ? updateLessonStep(course, lessonId, stepKey, completed) : course))
    );
  };

  const [themeToast, setThemeToast] = useState<{ visible: boolean; mode: 'dark' | 'light' } | null>(null);
  const [isGlowActive, setIsGlowActive] = useState(false);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    document.documentElement.classList.add('theme-transitioning');
    setIsGlowActive(true);

    const applyThemeChange = () => {
      setIsDarkMode(nextMode);
      setThemeToast({ visible: true, mode: nextMode ? 'dark' : 'light' });
    };

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

    window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
      setIsGlowActive(false);
    }, 550);

    window.setTimeout(() => {
      setThemeToast(null);
    }, 1800);
  };

  // The ZIP UI expects one active course object; the backend adapter supplies it.
  const masterclassCourse = courses[0] || EMPTY_COURSE;

  const handleToggleBookmark = (courseId: string) => {
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, isBookmarked: !c.isBookmarked } : c)));
  };

  const handleToggleLesson = (lessonId: string) => {
    setCourses((prev) =>
      prev.map((course) => {
        const hasLesson = course.lessons.some((l) => l.id === lessonId);
        if (!hasLesson) return course;

        const updatedLessons = course.lessons.map((l) => (l.id === lessonId ? { ...l, completed: !l.completed } : l));
        const newProgress = calculateCourseProgress(updatedLessons);
        const updatedCourse = { ...course, lessons: updatedLessons, progress: newProgress };

        if (activeCourseModal && activeCourseModal.id === course.id) {
          setActiveCourseModal(updatedCourse);
        }
        return updatedCourse;
      })
    );

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

    setProfile((prev) => {
      if (prev.dailyGoal && prev.dailyGoal.type === 'lessons') {
        return { ...prev, dailyGoal: { ...prev.dailyGoal, current: prev.dailyGoal.current + 1 } };
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
      return { ...prev, xp: newXp, level: levelInfo.level };
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
      setTodayUnits((prev) => prev.map((item) => (item.id === unitId ? { ...item, status: 'COMPLETED' } : item)));
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

  const handleLoginSuccess = (_user: { name: string; email: string; phone?: string; isNewUser: boolean }) => {
    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
    window.location.reload();
  };

  const handleCompleteOnboarding = async (data: { profile: Partial<UserProfile>; updatedMastery?: SubjectMastery[]; updatedWeakAreas?: WeakArea[] }) => {
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
    setProfile((prev) => ({ ...prev, ...updated }));
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

  return {
    profile, courses, notes, todayUnits, subjectMastery, weakAreas, practiceQuestions, pyqs, mistakes,
    uploadedResources, mistakeQuestion, tests, structuredCourses, notifications, achievements, activities,
    isDataLoading, dataError, dashboardSnapshot, curriculumTree, activeCurriculum, curriculumProgress, quickLabStats,
    isDarkMode, isLoggedIn, session, isAuthModalOpen, authMode, isOnboardingOpen, currentView, activeCourseModal,
    isProfileModalOpen, themeToast, isGlowActive, masterclassCourse, totalBookmarks, isAdminSession,
    setCurrentView, setActiveCourseModal, setIsProfileModalOpen, setIsAuthModalOpen, setIsOnboardingOpen,
    setDataError,
    toggleDarkMode,
    handleMarkNotificationRead, handleMarkAllNotificationsRead, handleClearAllNotifications,
    handleUpdateStructuredLessonStep, handleToggleBookmark, handleToggleLesson, handleUpdateDailyGoal,
    handleLogGoalProgress, handleAddXp, handleAddNote, handleDeleteNote, handleToggleTodayUnit, handleLaunchTodayUnit,
    handlePracticeTopic, handlePracticeAnswer, handlePracticeMistake, handlePyqAnswer, handleBookmarkQuestion,
    handleOpenAuth, handleLogout, handleLoginSuccess, handleCompleteOnboarding, handleUpdateProfile,
  };
}
