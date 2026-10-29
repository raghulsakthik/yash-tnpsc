import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  MoreVertical,
  Moon,
  Sun,
  ShieldAlert,
  Smartphone,
  Monitor,
  Download,
  X,
  Compass,
} from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

interface AndroidTopBarProps {
  title: string;
  subtitle?: string;
  onOpenDrawer: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAdminPortal: () => void;
  viewMode: 'device' | 'mobile' | 'desktop';
  onChangeViewMode: (mode: 'device' | 'mobile' | 'desktop') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const AndroidTopBar: React.FC<AndroidTopBarProps> = ({
  title,
  subtitle = 'TNPSC Group 2 & 2A',
  onOpenDrawer,
  onOpenNotifications,
  unreadCount,
  isDarkMode,
  onToggleDarkMode,
  onOpenAdminPortal,
  viewMode,
  onChangeViewMode,
  searchQuery,
  onSearchChange,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex flex-col bg-stone-50/96 dark:bg-stone-950/96 backdrop-blur-xl border-b border-stone-200/90 dark:border-stone-800/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] transition-colors select-none">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4">
        {/* Left: Drawer Trigger + Classical Academy Seal + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenDrawer}
            aria-label="Open Android navigation drawer"
            title="Open Academy Navigation Drawer"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/80 bg-white/90 text-stone-700 shadow-2xs hover:border-amber-400/50 hover:bg-amber-50/40 hover:text-stone-950 dark:border-stone-800/80 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:border-amber-500/40 dark:hover:bg-amber-950/20 dark:hover:text-stone-100 active:scale-95 transition-all cursor-pointer"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          {!isSearchOpen && (
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Roman Laurel Academy Medallion */}
              <div className="hidden xs:flex shrink-0">
                <BrandLogo size="sm" showWordmark={false} />
              </div>

              {/* Classical Roman Title & Academy Track */}
              <div className="min-w-0">
                <h2 className="truncate font-serif text-[15px] sm:text-base font-bold tracking-tight text-stone-900 dark:text-stone-50 leading-tight">
                  {title}
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 truncate tracking-wide">
                  <span>{subtitle}</span>
                  <span className="text-stone-300 dark:text-stone-700">·</span>
                  <span className="text-stone-500 dark:text-stone-400 hidden sm:inline">Academy Track</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center / Search Input Field Expansion */}
        {isSearchOpen ? (
          <div className="flex flex-1 items-center gap-2 px-1 animate-in fade-in duration-200">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <input
                type="text"
                autoFocus
                placeholder="Search lessons, PYQs, polity..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white py-1.5 pl-8.5 pr-8 text-xs text-stone-900 shadow-inner placeholder-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 focus:outline-hidden dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search input"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setIsSearchOpen(false);
                onSearchChange('');
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          /* Right Side Classical Actions */
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search Icon Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search curriculum and questions"
              title="Search curriculum"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/80 bg-white/90 text-stone-700 shadow-2xs hover:border-amber-400/50 hover:bg-amber-50/40 hover:text-stone-950 dark:border-stone-800/80 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:border-amber-500/40 dark:hover:bg-amber-950/20 active:scale-95 transition-all cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Notification Bell with Classical Laurel Badge */}
            <button
              onClick={onOpenNotifications}
              aria-label="Open study milestone notifications"
              title="Milestone Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/80 bg-white/90 text-stone-700 shadow-2xs hover:border-amber-400/50 hover:bg-amber-50/40 hover:text-stone-950 dark:border-stone-800/80 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:border-amber-500/40 dark:hover:bg-amber-950/20 active:scale-95 transition-all cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-linear-to-br from-orange-500 to-amber-600 px-1 text-[9px] font-bold text-white shadow-2xs ring-1.5 ring-stone-50 dark:ring-stone-950 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Professional Viewport Mode Switcher */}
            <div className="hidden sm:flex items-center rounded-xl border border-stone-200/80 bg-stone-100/90 p-0.5 dark:border-stone-800/80 dark:bg-stone-900/90 text-[11px] font-semibold shadow-inner">
              <button
                onClick={() => onChangeViewMode('device')}
                title="Android Phone Mockup Frame"
                className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-all cursor-pointer ${
                  viewMode === 'device'
                    ? 'bg-white text-stone-900 font-bold shadow-2xs dark:bg-stone-800 dark:text-amber-400 ring-1 ring-amber-500/30'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                <span>Pixel 8</span>
              </button>
              <button
                onClick={() => onChangeViewMode('mobile')}
                title="Edge-to-Edge Mobile View"
                className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-all cursor-pointer ${
                  viewMode === 'mobile'
                    ? 'bg-white text-stone-900 font-bold shadow-2xs dark:bg-stone-800 dark:text-amber-400 ring-1 ring-amber-500/30'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                <span>Mobile</span>
              </button>
              <button
                onClick={() => onChangeViewMode('desktop')}
                title="Expanded Multi-Column Desktop View"
                className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-all cursor-pointer ${
                  viewMode === 'desktop'
                    ? 'bg-white text-stone-900 font-bold shadow-2xs dark:bg-stone-800 dark:text-amber-400 ring-1 ring-amber-500/30'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                <Monitor className="h-3 w-3" />
                <span>Desktop</span>
              </button>
            </div>

            {/* Material 3 Classical 3-Dots Overflow Menu */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="More academy options"
                title="Menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/80 bg-white/90 text-stone-700 shadow-2xs hover:border-amber-400/50 hover:bg-amber-50/40 hover:text-stone-950 dark:border-stone-800/80 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:border-amber-500/40 dark:hover:bg-amber-950/20 active:scale-95 transition-all cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl border border-stone-200/90 bg-white p-1.5 shadow-xl dark:border-stone-800 dark:bg-stone-900 text-xs font-semibold animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenAdminPortal();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-stone-800 hover:bg-amber-50 hover:text-amber-900 dark:text-stone-200 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 cursor-pointer transition-colors"
                    >
                      <ShieldAlert className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <div>
                        <div className="font-bold">NOVA Admin Portal</div>
                        <div className="text-[10px] text-stone-500 font-normal">33 Sections & Proctoring Suite</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onToggleDarkMode();
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-stone-800 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {isDarkMode ? (
                          <Sun className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Moon className="h-4 w-4 text-orange-500" />
                        )}
                        <span>{isDarkMode ? 'Light appearance' : 'Obsidian dark appearance'}</span>
                      </div>
                    </button>

                    <div className="my-1 border-t border-stone-200 dark:border-stone-800" />

                    <a
                      href="/nova-admin-and-notifications-design.zip"
                      download="nova-admin-and-notifications-design.zip"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-stone-800 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                    >
                      <Download className="h-4 w-4 text-stone-500" />
                      <span>Export Design Assets (.zip)</span>
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Classical Bottom Gold Accent Shimmer */}
      <div className="h-[1px] w-full bg-linear-to-r from-transparent via-amber-500/35 to-transparent" />
    </header>
  );
};
