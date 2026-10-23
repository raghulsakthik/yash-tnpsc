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
import {
  initialProfile,
  initialCourses,
  initialNotes,
  initialPracticeQuestions,
  initialResources,
  initialTodayUnits,
  initialSubjectMastery,
  initialWeakAreas,
  initialPYQs,
  initialMistakes,
  initialTests,
} from './data/mockData';
import { initialStructuredCourses } from './data/mockStructuredCourses';
import { initialNotifications } from './data/mockNotifications';
import {
  generateYearActivityData,
  calculateCourseProgress,
  getUserLevelInfo,
} from './utils/learningStats';
import { updateLessonStep } from './utils/courseCompletion';
import {
  Course,
  NoteItem,
  UserProfile,
  DailyGoal,
  TodayUnit,
  SubjectMastery,
  WeakArea,
  PYQItem,
  MistakeItem,
  TestSession,
  StructuredCourse,
  StructuredLesson,
  AppNotification,
} from './types';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('yash_profile') || localStorage.getItem('nova_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name === 'Nova') {
          return {
            ...parsed,
            name: 'Yashika',
            avatarText: 'Y',
            handle: '@yashika_tnpsc',
            email: 'yashika.aspirant@example.com',
          };
        }
        return parsed;
      } catch {
        return initialProfile;
      }
    }
    return initialProfile;
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('yash_courses') || localStorage.getItem('nova_courses');
    return saved ? JSON.parse(saved) : initialCourses;
  });

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem('yash_notes') || localStorage.getItem('nova_notes');
    return saved ? JSON.parse(saved) : initialNotes;
  });

  const [todayUnits, setTodayUnits] = useState<TodayUnit[]>(() => {
    const saved = localStorage.getItem('yash_today_units') || localStorage.getItem('nova_today_units');
    return saved ? JSON.parse(saved) : initialTodayUnits;
  });

  const [subjectMastery, setSubjectMastery] = useState<SubjectMastery[]>(() => {
    const saved = localStorage.getItem('yash_subject_mastery') || localStorage.getItem('nova_subject_mastery');
    return saved ? JSON.parse(saved) : initialSubjectMastery;
  });

  const [weakAreas, setWeakAreas] = useState<WeakArea[]>(() => {
    const saved = localStorage.getItem('yash_weak_areas') || localStorage.getItem('nova_weak_areas');
    return saved ? JSON.parse(saved) : initialWeakAreas;
  });

  const [pyqs, setPyqs] = useState<PYQItem[]>(() => {
    const saved = localStorage.getItem('yash_pyqs') || localStorage.getItem('nova_pyqs');
    return saved ? JSON.parse(saved) : initialPYQs;
  });

  const [mistakes, setMistakes] = useState<MistakeItem[]>(() => {
    const saved = localStorage.getItem('yash_mistakes') || localStorage.getItem('nova_mistakes');
    return saved ? JSON.parse(saved) : initialMistakes;
  });

  const [tests, setTests] = useState<TestSession[]>(() => {
    const saved = localStorage.getItem('yash_tests') || localStorage.getItem('nova_tests');
    return saved ? JSON.parse(saved) : initialTests;
  });

  const [structuredCourses, setStructuredCourses] = useState<StructuredCourse[]>(() => {
    const saved = localStorage.getItem('yash_structured_courses') || localStorage.getItem('nova_structured_courses');
    return saved ? JSON.parse(saved) : initialStructuredCourses;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('yash_notifications') || localStorage.getItem('nova_notifications');
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [activities, setActivities] = useState(() => generateYearActivityData(365));

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (localStorage.getItem('yash_dark_mode') || localStorage.getItem('nova_dark_mode')) === 'true';
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('yash_logged_in') || localStorage.getItem('nova_logged_in');
    return saved !== 'false';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem('yash_onboarded') !== 'true' && localStorage.getItem('nova_onboarded') !== 'true';
  });

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

  // Persist profile
  useEffect(() => {
    localStorage.setItem('yash_profile', JSON.stringify(profile));
    localStorage.setItem('nova_profile', JSON.stringify(profile));
  }, [profile]);

  // Persist courses
  useEffect(() => {
    localStorage.setItem('yash_courses', JSON.stringify(courses));
    localStorage.setItem('nova_courses', JSON.stringify(courses));
  }, [courses]);

  // Persist notes
  useEffect(() => {
    localStorage.setItem('yash_notes', JSON.stringify(notes));
    localStorage.setItem('nova_notes', JSON.stringify(notes));
  }, [notes]);

  // Persist today units
  useEffect(() => {
    localStorage.setItem('yash_today_units', JSON.stringify(todayUnits));
    localStorage.setItem('nova_today_units', JSON.stringify(todayUnits));
  }, [todayUnits]);

  // Persist pyqs
  useEffect(() => {
    localStorage.setItem('yash_pyqs', JSON.stringify(pyqs));
    localStorage.setItem('nova_pyqs', JSON.stringify(pyqs));
  }, [pyqs]);

  // Persist mistakes
  useEffect(() => {
    localStorage.setItem('yash_mistakes', JSON.stringify(mistakes));
    localStorage.setItem('nova_mistakes', JSON.stringify(mistakes));
  }, [mistakes]);

  // Persist tests
  useEffect(() => {
    localStorage.setItem('yash_tests', JSON.stringify(tests));
    localStorage.setItem('nova_tests', JSON.stringify(tests));
  }, [tests]);

  // Persist structured courses
  useEffect(() => {
    localStorage.setItem('yash_structured_courses', JSON.stringify(structuredCourses));
    localStorage.setItem('nova_structured_courses', JSON.stringify(structuredCourses));
  }, [structuredCourses]);

  // Persist notifications
  useEffect(() => {
    localStorage.setItem('yash_notifications', JSON.stringify(notifications));
    localStorage.setItem('nova_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
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

  // Active masterclass course (Wireframing & Prototyping)
  const masterclassCourse = courses[0];

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

  const handleUpdateDailyGoal = (dailyGoal: DailyGoal) => {
    setProfile((prev) => ({
      ...prev,
      dailyGoal,
    }));
  };

  const handleLogGoalProgress = (amount: number) => {
    setProfile((prev) => {
      const existing = prev.dailyGoal || { type: 'hours', target: 2, current: 1.5 };
      return {
        ...prev,
        dailyGoal: {
          ...existing,
          current: Math.round((existing.current + amount) * 10) / 10,
        },
      };
    });
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

  const handleAddNote = (newNoteData: Omit<NoteItem, 'id' | 'date'>) => {
    const newNote: NoteItem = {
      ...newNoteData,
      id: `note-${Date.now()}`,
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleToggleTodayUnit = (unitId: string) => {
    setTodayUnits((prev) =>
      prev.map((unit) => {
        if (unit.id !== unitId) return unit;
        const nextStatus = unit.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED';
        if (nextStatus === 'COMPLETED') {
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
          setProfile((prof) => {
            if (prof.dailyGoal && prof.dailyGoal.type === 'lessons') {
              return {
                ...prof,
                dailyGoal: {
                  ...prof.dailyGoal,
                  current: prof.dailyGoal.current + 1,
                },
              };
            }
            return prof;
          });
        }
        return { ...unit, status: nextStatus };
      })
    );
  };

  const handleLaunchTodayUnit = (unit: TodayUnit) => {
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

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('yash_logged_in', 'false');
    localStorage.setItem('nova_logged_in', 'false');
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (user: {
    name: string;
    email: string;
    phone?: string;
    isNewUser: boolean;
  }) => {
    setIsLoggedIn(true);
    localStorage.setItem('yash_logged_in', 'true');
    localStorage.setItem('nova_logged_in', 'true');
    setIsAuthModalOpen(false);

    if (user.isNewUser) {
      setProfile((prev) => ({
        ...prev,
        name: user.name,
        email: user.email,
        phone: user.phone || prev.phone,
        handle: `@${user.name.toLowerCase().replace(/\s+/g, '_')}`,
      }));
      setIsOnboardingOpen(true);
    }
  };

  const handleCompleteOnboarding = (data: {
    profile: Partial<UserProfile>;
    updatedMastery?: SubjectMastery[];
    updatedWeakAreas?: WeakArea[];
  }) => {
    setProfile((prev) => ({
      ...prev,
      ...data.profile,
    }));
    if (data.updatedMastery) {
      setSubjectMastery(data.updatedMastery);
    }
    if (data.updatedWeakAreas) {
      setWeakAreas(data.updatedWeakAreas);
    }
    localStorage.setItem('yash_onboarded', 'true');
    localStorage.setItem('nova_onboarded', 'true');
    setIsOnboardingOpen(false);
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  const totalBookmarks = courses.filter((c) => c.isBookmarked).length;

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
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
              />
            )}

            {/* LEARN -> PRACTISE VIEW */}
            {currentView === 'practise' && (
              <PracticeView
                questions={initialPracticeQuestions}
                onAddXp={handleAddXp}
              />
            )}

            {/* LEARN -> QUICK LAB VIEW */}
            {currentView === 'quicklab' && (
              <QuickLabView onAddXp={handleAddXp} />
            )}

            {/* EXAM HUB -> PYQs VIEW */}
            {currentView === 'pyqs' && (
              <PYQView pyqs={pyqs} onAddXp={handleAddXp} />
            )}

            {/* EXAM HUB -> TESTS VIEW */}
            {currentView === 'tests' && (
              <TestsView tests={tests} onAddXp={handleAddXp} />
            )}

            {/* EXAM HUB -> JOURNEY ROADMAP VIEW */}
            {currentView === 'journey' && (
              <JourneyView />
            )}

            {/* EXAM HUB -> MISTAKE ENGINE VIEW */}
            {currentView === 'mistakes' && (
              <MistakesView mistakes={mistakes} onAddXp={handleAddXp} />
            )}

            {/* RESOURCES -> LINKS VIEW */}
            {currentView === 'resources-links' && (
              <ResourcesView resources={initialResources} defaultTab="links" />
            )}

            {/* RESOURCES -> DOWNLOAD VIEW */}
            {currentView === 'resources-download' && (
              <ResourcesView resources={initialResources} defaultTab="download" />
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
        onComplete={handleCompleteOnboarding}
        onClose={() => setIsOnboardingOpen(false)}
      />

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
