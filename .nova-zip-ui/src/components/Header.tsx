import React, { useState } from 'react';
import { Search, Bell, BellOff, Menu, X } from 'lucide-react';
import { getGreeting } from '../utils/learningStats';
import { UserProfile, AppNotification } from '../types';
import { NotificationDrawer } from './NotificationDrawer';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  profile: UserProfile;
  onOpenProfile: () => void;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoggedIn?: boolean;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onLogout?: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNavigateTo: (targetView: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  onOpenProfile,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  isLoggedIn = true,
  onOpenAuth,
  onLogout,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNavigateTo,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const greeting = getGreeting(profile.name);
  const isNotificationsOn = profile.notificationsEnabled ?? true;
  const unreadCount = notifications.filter((n) => n.unread).length;
  const weeklyGoalHours = Number(((profile.dailyGoal?.target || 0.5) * 7).toFixed(1));
  const todayGoalHours = Number((profile.dailyGoal?.current || 0).toFixed(1));

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95 sm:px-6">
      {/* Left side: Mobile menu toggle + Classic Brand Seal & Greeting */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand Seal Visible on Mobile/Tablet */}
        <div className="flex items-center lg:hidden">
          <BrandLogo size="sm" showWordmark={false} />
        </div>

        {/* Dynamic greeting: "Good Afternoon, Yashika" */}
        <div>
          <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white sm:text-xl font-serif">
            {greeting}
          </h1>
          <p className="hidden text-xs text-neutral-500 dark:text-neutral-400 sm:block">
            Syllabus Track: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{profile.examTrack || profile.exam}</span> · Weekly Goal: {todayGoalHours}/{weeklyGoalHours} hrs today
          </p>
        </div>
      </div>

      {/* Right side: Search, Notifications bell drawer trigger, Auth / Profile button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search lessons, PYQs, polity..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-56 rounded-xl border border-neutral-200 bg-neutral-50 py-1.5 pl-9 pr-3 text-xs text-neutral-800 placeholder-neutral-400 transition-all focus:border-neutral-900 focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-white lg:w-72"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Notifications Bell (Opens Study Milestones & Test Drawer) */}
        <div className="relative">
          <button
            onClick={() => setIsDrawerOpen(true)}
            aria-label="View study milestones and test reminders"
            title="Open Study Alerts & Milestones Drawer"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition-all"
          >
            {isNotificationsOn ? (
              <>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:bg-white dark:text-neutral-900 dark:ring-neutral-900">
                    {unreadCount}
                  </span>
                )}
              </>
            ) : (
              <BellOff className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            )}
          </button>
        </div>

        {/* Notification Drawer Component */}
        <NotificationDrawer
          isOpen={isDrawerOpen}
          learnerName={profile.name}
          onClose={() => setIsDrawerOpen(false)}
          notifications={notifications}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onClearAll={onClearAll}
          onNavigateTo={onNavigateTo}
        />

        {/* Profile / Auth Button */}
        {isLoggedIn ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition-colors hover:border-orange-300 hover:bg-orange-50/50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-orange-500 dark:hover:bg-neutral-700"
              title="Open Profile Settings"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[12px] font-bold text-white shadow-2xs">
                {profile.emojiAvatar || profile.avatarText}
              </div>
              <span className="hidden sm:inline">{profile.name}</span>
            </button>
            {onOpenAuth && (
              <button
                onClick={() => onOpenAuth('login')}
                className="hidden rounded-xl border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:inline-flex"
                title="Switch Account or Login"
              >
                Switch
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth && onOpenAuth('signup')}
              className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-600"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
