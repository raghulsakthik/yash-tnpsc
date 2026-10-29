import React from 'react';
import {
  Compass,
  GraduationCap,
  PenTool,
  ShieldCheck,
  Award,
} from 'lucide-react';

export type AndroidTabKey = 'today' | 'courses' | 'practice' | 'tests' | 'profile';

interface AndroidBottomNavProps {
  activeTab: AndroidTabKey;
  onSelectTab: (tab: AndroidTabKey) => void;
  unreadTestsCount?: number;
  uncompletedUnitsCount?: number;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadTestsCount = 1,
  uncompletedUnitsCount = 2,
}) => {
  const tabs = [
    {
      key: 'today' as AndroidTabKey,
      label: 'Today',
      description: 'Daily Curriculum',
      icon: Compass,
      badge: uncompletedUnitsCount > 0 ? uncompletedUnitsCount : undefined,
    },
    {
      key: 'courses' as AndroidTabKey,
      label: 'Syllabus',
      description: 'Courses & Units',
      icon: GraduationCap,
    },
    {
      key: 'practice' as AndroidTabKey,
      label: 'Practice',
      description: 'MCQs & PYQs',
      icon: PenTool,
    },
    {
      key: 'tests' as AndroidTabKey,
      label: 'Mocks',
      description: 'Supervised Tests',
      icon: ShieldCheck,
      badge: unreadTestsCount > 0 ? unreadTestsCount : undefined,
    },
    {
      key: 'profile' as AndroidTabKey,
      label: 'Progress',
      description: 'Rank & Mastery',
      icon: Award,
    },
  ];

  return (
    <nav
      className="sticky bottom-0 z-30 flex flex-col bg-stone-50/96 dark:bg-stone-950/96 backdrop-blur-xl border-t border-stone-200/90 dark:border-stone-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-8px_35px_rgba(0,0,0,0.6)] transition-colors select-none"
      role="navigation"
      aria-label="Android Bottom Navigation"
    >
      {/* Classical Subtle Top Gold Accent Shimmer */}
      <div className="h-[1.5px] w-full bg-linear-to-r from-transparent via-amber-500/40 to-transparent" />

      {/* 5 Tab Navigation Container */}
      <div className="flex h-16 items-center justify-around px-2 pt-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className="group relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 cursor-pointer active:scale-92 focus:outline-hidden"
              aria-selected={isActive}
              title={`${tab.label} · ${tab.description}`}
            >
              {/* Active Tab Upper Anchor Indicator Pip */}
              <div
                className={`h-1 w-5 rounded-full transition-all duration-300 mb-1 ${
                  isActive
                    ? 'bg-amber-500 dark:bg-amber-400 opacity-100 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                    : 'bg-transparent opacity-0 scale-50'
                }`}
                aria-hidden="true"
              />

              {/* Material 3 Expressive Classical Pill */}
              <div
                className={`relative flex h-8 w-14 items-center justify-center rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-linear-to-b from-amber-500/18 to-orange-500/22 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/35 dark:ring-amber-400/45 shadow-xs'
                    : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-700 dark:group-hover:text-stone-300 group-hover:bg-stone-200/40 dark:group-hover:bg-stone-800/40'
                }`}
              >
                <Icon
                  className={`h-[19px] w-[19px] transition-transform duration-300 ${
                    isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />

                {/* Classical Laurel Badge Counter */}
                {tab.badge !== undefined && (
                  <span
                    className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-linear-to-br from-orange-500 to-amber-600 px-1 text-[9px] font-bold text-white shadow-2xs ring-1.5 ring-stone-50 dark:ring-stone-950 animate-pulse"
                    aria-label={`${tab.badge} unread items`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Refined Classical Label */}
              <span
                className={`mt-1 text-[10.5px] transition-colors duration-200 ${
                  isActive
                    ? 'font-serif font-bold tracking-tight text-amber-900 dark:text-amber-300'
                    : 'font-sans font-medium text-stone-500 dark:text-stone-400 group-hover:text-stone-800 dark:group-hover:text-stone-200'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Android Precision Gesture Navigation Pill */}
      <div className="flex h-4 w-full items-center justify-center pb-1">
        <div className="h-1 w-32 rounded-full bg-stone-300/80 dark:bg-stone-700/80 transition-colors" />
      </div>
    </nav>
  );
};
