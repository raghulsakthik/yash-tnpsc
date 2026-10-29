import React from 'react';
import {
  Home,
  GraduationCap,
  Bookmark,
  Bell,
  BookOpen,
  PenTool,
  FlaskConical,
  FileCheck,
  Archive,
  Compass,
  AlertTriangle,
  ShieldAlert,
  Settings,
  Moon,
  Sun,
  X,
  Flame,
  Award,
  ChevronRight,
  Download,
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { BrandLogo } from '../BrandLogo';

interface AndroidDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  currentView: string;
  onSelectView: (view: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAdminPortal: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
}

export const AndroidDrawer: React.FC<AndroidDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  currentView,
  onSelectView,
  isDarkMode,
  onToggleDarkMode,
  onOpenAdminPortal,
  onOpenNotifications,
  unreadCount,
}) => {
  if (!isOpen) return null;

  const handleNav = (v: string) => {
    onSelectView(v);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-xs animate-in fade-in select-none"
      role="dialog"
      aria-modal="true"
    >
      {/* Click outside to dismiss */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Body (Material 3 standard width: 320px) */}
      <div className="relative flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-left duration-250 overflow-hidden">
        {/* Drawer Header with Aspirant Card */}
        <div className="border-b border-neutral-200 bg-linear-to-br from-orange-50 via-amber-50 to-neutral-50 p-5 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
          <div className="flex items-center justify-between">
            <BrandLogo size="sm" showWordmark={true} />
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-200/50 hover:text-neutral-700 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-lg font-bold text-white shadow-sm ring-2 ring-orange-300 dark:ring-orange-900">
              {profile.emojiAvatar || profile.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-white font-serif">
                  {profile.name}
                </h3>
                <span className="rounded-md bg-orange-100 px-1.5 py-0.2 text-[9px] font-black text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                  Lvl 3
                </span>
              </div>
              <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                {profile.handle || '@yashika_tnpsc'}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                {profile.examTrack || 'TNPSC Group 2 & 2A'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white/80 p-2 text-center text-xs shadow-2xs dark:bg-neutral-800/60">
            <div className="flex items-center justify-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-bold text-neutral-800 dark:text-neutral-200">14 Days</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 border-l border-neutral-200 dark:border-neutral-700">
              <Award className="h-4 w-4 text-amber-500" />
              <span className="font-bold text-neutral-800 dark:text-neutral-200">1,420 XP</span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs font-semibold">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Study Core
          </div>

          <button
            onClick={() => handleNav('home')}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-all cursor-pointer ${
              currentView === 'home'
                ? 'bg-orange-500 text-white font-bold shadow-xs'
                : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Home className="h-4.5 w-4.5" />
              <span>Today's Plan</span>
            </div>
            <span className="text-[10px] opacity-75">Queue (3)</span>
          </button>

          <button
            onClick={() => handleNav('courses')}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-all cursor-pointer ${
              currentView === 'courses'
                ? 'bg-orange-500 text-white font-bold shadow-xs'
                : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <GraduationCap className="h-4.5 w-4.5" />
              <span>Courses & Syllabus</span>
            </div>
            <span className="rounded-md bg-neutral-200 px-1.5 py-0.5 text-[9px] text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              TNPSC
            </span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenNotifications();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Bell className="h-4.5 w-4.5 text-amber-500" />
              <span>Alerts & Badges</span>
            </div>
            {unreadCount > 0 && (
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <div className="pt-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Practice & Mocks
          </div>

          <button
            onClick={() => handleNav('practise')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <PenTool className="h-4.5 w-4.5 text-neutral-500" />
            <span>Adaptive MCQs</span>
          </button>

          <button
            onClick={() => handleNav('pyqs')}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Archive className="h-4.5 w-4.5 text-purple-500" />
              <span>PYQs (2022-2024)</span>
            </div>
            <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              Bank
            </span>
          </button>

          <button
            onClick={() => handleNav('quicklab')}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FlaskConical className="h-4.5 w-4.5 text-emerald-500" />
              <span>Quick Lab Sprint</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">5-Min</span>
          </button>

          <button
            onClick={() => handleNav('tests')}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileCheck className="h-4.5 w-4.5 text-blue-500" />
              <span>Proctored Mocks</span>
            </div>
            <span className="text-[10px] text-blue-600 font-bold">Gate 1</span>
          </button>

          <button
            onClick={() => handleNav('journey')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <Compass className="h-4.5 w-4.5 text-teal-500" />
            <span>7-Phase Journey Map</span>
          </button>

          <button
            onClick={() => handleNav('mistakes')}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
              <span>Mistake Engine</span>
            </div>
            <span className="text-[10px] text-amber-600 font-bold">3 Active</span>
          </button>

          {/* Admin Portal Gateway */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              onClick={() => {
                onClose();
                onOpenAdminPortal();
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-orange-50 p-3 text-orange-950 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-200 dark:hover:bg-orange-900/40 transition-colors cursor-pointer border border-orange-200 dark:border-orange-900/60"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-xs font-bold">NOVA Admin Panel</div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Control plane, CRUD & proctoring
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-orange-600" />
            </button>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800 space-y-2 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-600 dark:text-neutral-400">Theme</span>
            <button
              onClick={onToggleDarkMode}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1 text-neutral-700 hover:bg-white dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-orange-400" />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          <a
            href="/nova-admin-and-notifications-design.zip"
            download="nova-admin-and-notifications-design.zip"
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-orange-500" />
            <span>Export Design Package (.zip)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
