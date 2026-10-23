import React from 'react';
import {
  Home,
  Bookmark,
  BookOpen,
  PenTool,
  FlaskConical,
  Link2,
  Download,
  Moon,
  Sun,
  Settings,
  ChevronRight,
  GraduationCap,
  Archive,
  FileCheck,
  Compass,
  AlertTriangle,
  LogIn,
  LogOut,
} from 'lucide-react';

import { UserProfile } from '../types';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenProfile: () => void;
  bookmarkCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  profile?: UserProfile;
  isLoggedIn?: boolean;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isDarkMode,
  onToggleDarkMode,
  onOpenProfile,
  bookmarkCount,
  isOpenMobile,
  onCloseMobile,
  profile,
  isLoggedIn = true,
  onOpenAuth,
  onLogout,
}) => {
  const handleNav = (view: string) => {
    onSelectView(view);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isDarkMode
            ? 'border-neutral-800 bg-neutral-900 text-neutral-100'
            : 'border-neutral-200 bg-white text-neutral-800'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main Navigation"
      >
        {/* Brand: Classic Black Illustration Monogram & Académie Seal */}
        <div className="border-b px-5 py-4 border-inherit space-y-3">
          <BrandLogo size="md" showWordmark={true} />

          {/* Aspirant Identity Card */}
          <button
            onClick={onOpenProfile}
            className="group flex w-full items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-2 text-left hover:border-neutral-300 hover:bg-neutral-100/80 dark:border-neutral-800 dark:bg-neutral-850 dark:hover:border-neutral-700 transition-all focus:outline-hidden"
            title="View Profile Settings"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-base font-bold text-white shadow-2xs dark:bg-white dark:text-neutral-900">
                <span>{profile?.emojiAvatar || '🦉'}</span>
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                    {profile?.name || 'Yashika'}
                  </span>
                  <span className="rounded-sm bg-neutral-200 px-1 py-0.2 text-[9px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {profile?.programme || 'TNPSC'}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                  {profile?.examTrack || 'Group 2 & 2A'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Navigation items matching the hand-drawn sketch */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main top links: Home (Adaptive Plan), Courses (Syllabus Programs), Bookmarks */}
          <div className="space-y-1">
            <button
              onClick={() => handleNav('home')}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                currentView === 'home'
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
              }`}
            >
              <Home className="h-4.5 w-4.5 shrink-0" />
              <span>Today's Plan</span>
            </button>

            {/* Structured Courses & Course Completion Link */}
            <button
              onClick={() => handleNav('courses')}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                currentView === 'courses'
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="h-4.5 w-4.5 shrink-0" />
                <span>Courses & Syllabus</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  currentView === 'courses'
                    ? 'bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white'
                    : 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
                }`}
              >
                TNPSC
              </span>
            </button>

            <button
              onClick={() => handleNav('bookmarks')}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                currentView === 'bookmarks'
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bookmark className="h-4.5 w-4.5 shrink-0" />
                <span>Bookmarks</span>
              </div>
              {bookmarkCount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    currentView === 'bookmarks'
                      ? 'bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white'
                      : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  {bookmarkCount}
                </span>
              )}
            </button>
          </div>

          {/* Section: Learn */}
          <div>
            <div className="px-3.5 pb-2 text-[11px] font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-300">
              Learn
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNav('notes')}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentView === 'notes'
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <BookOpen className="h-4.5 w-4.5 shrink-0" />
                <span>Notes</span>
              </button>

              <button
                onClick={() => handleNav('practise')}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentView === 'practise'
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <PenTool className="h-4.5 w-4.5 shrink-0" />
                <span>Practise</span>
              </button>

              <button
                onClick={() => handleNav('quicklab')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentView === 'quicklab'
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FlaskConical className="h-4.5 w-4.5 shrink-0" />
                  <span>Quick Lab</span>
                </div>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Sprint
                </span>
              </button>
            </div>
          </div>

          {/* Section: Exam Hub (YASH Adaptive Engine) */}
          <div>
            <div className="px-3.5 pb-2 text-[11px] font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-300">
              Exam Hub
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNav('pyqs')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentView === 'pyqs'
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Archive className="h-4.5 w-4.5 shrink-0" />
                  <span>PYQs (2022-24)</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  currentView === 'pyqs' ? 'bg-white text-orange-600' : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                }`}>
                  Bank
                </span>
              </button>

              <button
                onClick={() => handleNav('tests')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentView === 'tests'
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileCheck className="h-4.5 w-4.5 shrink-0" />
                  <span>Tests & Mocks</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  currentView === 'tests' ? 'bg-white text-orange-600' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  Gate 1
                </span>
              </button>

              <button
                onClick={() => handleNav('journey')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentView === 'journey'
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Compass className="h-4.5 w-4.5 shrink-0" />
                  <span>Journey Map</span>
                </div>
                <span className="rounded-sm bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                  7 Phases
                </span>
              </button>

              <button
                onClick={() => handleNav('mistakes')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentView === 'mistakes'
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                  <span>Mistake Engine</span>
                </div>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                  3 Active
                </span>
              </button>
            </div>
          </div>

          {/* Section: Resources */}
          <div>
            <div className="px-3.5 pb-2 text-[11px] font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-300">
              Resources
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNav('resources-links')}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentView === 'resources-links'
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <Link2 className="h-4.5 w-4.5 shrink-0" />
                <span>Link's</span>
              </button>

              <button
                onClick={() => handleNav('resources-download')}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  currentView === 'resources-download'
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <Download className="h-4.5 w-4.5 shrink-0" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom controls: Dark Mode switch & Settings -> Profile */}
        <div className="border-t p-3 space-y-2 border-inherit">
          {/* Dark Mode toggle */}
          <div className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 transition-colors duration-300">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-5 w-5 items-center justify-center">
                <Moon
                  className={`absolute h-4.5 w-4.5 text-orange-400 transition-all duration-300 ${
                    isDarkMode
                      ? 'scale-100 rotate-0 opacity-100'
                      : 'scale-0 -rotate-90 opacity-0'
                  }`}
                />
                <Sun
                  className={`absolute h-4.5 w-4.5 text-amber-500 transition-all duration-300 ${
                    isDarkMode
                      ? 'scale-0 rotate-90 opacity-0'
                      : 'scale-100 rotate-0 opacity-100'
                  }`}
                />
              </div>
              <span className="font-medium select-none">
                {isDarkMode ? 'Dark mode' : 'Light mode'}
              </span>
            </div>
            <button
              onClick={onToggleDarkMode}
              role="switch"
              aria-checked={isDarkMode}
              aria-label="Toggle dark mode"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-orange-400/50 ${
                isDarkMode ? 'bg-orange-500 shadow-xs' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${
                  isDarkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Settings -> Profile button */}
          <button
            onClick={onOpenProfile}
            className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="h-4.5 w-4.5 text-neutral-500 dark:text-neutral-400" />
              <span>Settings → Profile</span>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          </button>

          {/* Log In / Sign Out control */}
          {isLoggedIn ? (
            <button
              onClick={() => onLogout && onLogout()}
              className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out ({profile?.name || 'Aspirant'})</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-orange-600 transition-all"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
