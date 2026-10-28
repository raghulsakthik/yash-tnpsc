import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  Sparkles,
  Award,
  Calendar,
  Clock,
  ArrowRight,
  Flame,
  CheckCircle2,
  Trophy,
  PartyPopper,
  ShieldCheck,
  Star,
  ExternalLink,
  Share2,
  Download,
} from 'lucide-react';
import { AppNotification, NotificationCategory } from '../../types';
import { BrandLogo } from './BrandLogo';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNavigateTo: (targetView: string) => void;
}

/**
 * Specialized Milestone Achievement Badge Component
 * Renders an official classical Roman-laurel academy medal with
 * metallic gold gradient, ribbon tails, XP bonuses, and verified seal.
 */
const MilestoneBadgeCard: React.FC<{
  notif: AppNotification;
  onCelebrate: (notif: AppNotification) => void;
  onViewCredential: (notif: AppNotification) => void;
}> = ({ notif, onCelebrate, onViewCredential }) => {
  const tier = notif.badgeTier || 'Gold';
  const isDiamond = tier === 'Diamond';
  const isPlatinum = tier === 'Platinum';

  const tierColors = isDiamond
    ? {
        border: 'border-cyan-400 dark:border-cyan-500',
        badgeBg: 'bg-linear-to-r from-cyan-600 via-sky-500 to-indigo-600',
        text: 'text-cyan-700 dark:text-cyan-300',
        glow: 'from-cyan-400/20 via-sky-400/10 to-transparent',
        medalGradient: 'from-cyan-100 via-sky-200 to-indigo-300',
        medalIcon: 'text-cyan-700',
      }
    : isPlatinum
    ? {
        border: 'border-slate-300 dark:border-slate-600',
        badgeBg: 'bg-linear-to-r from-slate-700 via-neutral-600 to-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        glow: 'from-slate-400/20 via-neutral-400/10 to-transparent',
        medalGradient: 'from-slate-100 via-neutral-200 to-slate-300',
        medalIcon: 'text-slate-700',
      }
    : {
        border: 'border-amber-400 dark:border-amber-500',
        badgeBg: 'bg-linear-to-r from-amber-600 via-yellow-500 to-amber-700',
        text: 'text-amber-800 dark:text-amber-300',
        glow: 'from-amber-400/25 via-yellow-400/15 to-transparent',
        medalGradient: 'from-amber-200 via-yellow-300 to-amber-500',
        medalIcon: 'text-amber-900',
      };

  return (
    <div
      className={`relative mt-3 overflow-hidden rounded-xl border ${tierColors.border} bg-linear-to-b from-white to-amber-50/50 p-3.5 shadow-sm dark:from-neutral-850 dark:to-neutral-900 shimmer-badge`}
    >
      {/* Subtle celebratory ambient glow in corner */}
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-linear-to-br ${tierColors.glow} blur-xl`}
      />

      <div className="flex items-start gap-3">
        {/* Classical Academy Ribbon Medal Insignia */}
        <div className="relative shrink-0">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-b ${tierColors.medalGradient} shadow-md border border-white/60 dark:border-amber-400/30 ring-2 ring-amber-400/30`}
          >
            <Trophy className={`h-6 w-6 ${tierColors.medalIcon}`} />
          </div>

          {/* Ribbon Swallowtail Tails underneath medal */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
            <span className="h-2 w-1.5 -rotate-12 rounded-xs bg-amber-600 shadow-2xs" />
            <span className="h-2 w-1.5 rotate-12 rounded-xs bg-amber-700 shadow-2xs" />
          </div>
        </div>

        {/* Badge Metadata & Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white ${tierColors.badgeBg} shadow-2xs`}
            >
              <Star className="h-2.5 w-2.5 fill-current" />
              <span>{tier} MILESTONE</span>
            </span>

            {notif.xpBonus && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                <Sparkles className="h-2.5 w-2.5" />
                <span>+{notif.xpBonus} XP BONUS</span>
              </span>
            )}
          </div>

          <h5 className="mt-1 text-xs font-bold text-neutral-900 dark:text-white truncate">
            {notif.moduleTitle || notif.title}
          </h5>

          {notif.courseName && (
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
              {notif.courseName} · Verified Syllabus Module
            </p>
          )}

          {/* Verification stamp banner */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>100% Curriculum Mastery</span>
            </span>

            <span className="text-neutral-300 dark:text-neutral-700">·</span>

            <button
              onClick={() => onCelebrate(notif)}
              className="group inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-500/25 dark:bg-amber-400/15 dark:text-amber-300 transition-colors"
            >
              <PartyPopper className="h-3 w-3 transition-transform group-hover:scale-125" />
              <span>Celebrate 🎉</span>
            </button>

            <button
              onClick={() => onViewCredential(notif)}
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-neutral-600 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-white"
            >
              <span>View Credential</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNavigateTo,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | NotificationCategory>('all');
  const [selectedMilestoneCredential, setSelectedMilestoneCredential] =
    useState<AppNotification | null>(null);
  const [celebrationEffectActive, setCelebrationEffectActive] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === 'all') return true;
    return notif.category === activeFilter;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleActionClick = (notif: AppNotification) => {
    onMarkAsRead(notif.id);
    if (notif.targetView) {
      onNavigateTo(notif.targetView);
      onClose();
    }
  };

  const handleTriggerCelebrate = (notif: AppNotification) => {
    setCelebrationEffectActive(notif.id);
    window.setTimeout(() => {
      setCelebrationEffectActive(null);
    }, 2800);
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'milestone':
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case 'test_reminder':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'achievement':
        return <Award className="h-4 w-4 text-orange-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-purple-500" />;
    }
  };

  const getCategoryBadge = (category: NotificationCategory) => {
    switch (category) {
      case 'milestone':
        return 'text-amber-800 bg-amber-100 dark:bg-amber-950/70 dark:text-amber-300';
      case 'test_reminder':
        return 'text-blue-700 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300';
      case 'achievement':
        return 'text-orange-700 bg-orange-100 dark:bg-orange-950/60 dark:text-orange-300';
      default:
        return 'text-neutral-700 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Notification Center"
    >
      {/* Background click to dismiss */}
      <div className="flex-1" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container */}
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 p-5 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showWordmark={false} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Study Alerts & Milestones
                </h2>
                {unreadCount > 0 && (
                  <span className="flex h-5 items-center justify-center rounded-full bg-orange-500 px-2 text-[10px] font-bold text-white">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Milestones, scheduled tests & achievement feed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href="/nova-admin-and-notifications-design.zip"
              download="nova-admin-and-notifications-design.zip"
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11px] font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition-colors shadow-2xs"
              title="Download standalone Admin & Notification design ZIP"
            >
              <Download className="h-3.5 w-3.5 text-orange-500" />
              <span>Export ZIP</span>
            </a>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
              aria-label="Close notification drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex border-b border-neutral-200 px-4 py-2 gap-1 overflow-x-auto text-xs font-medium dark:border-neutral-800">
          <button
            onClick={() => setActiveFilter('all')}
            className={`rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-neutral-900 text-white font-semibold dark:bg-white dark:text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            All ({notifications.length})
          </button>

          <button
            onClick={() => setActiveFilter('milestone')}
            className={`rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'milestone'
                ? 'bg-neutral-900 text-white font-semibold dark:bg-white dark:text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span>
              Milestones ({notifications.filter((n) => n.category === 'milestone').length})
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('test_reminder')}
            className={`rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeFilter === 'test_reminder'
                ? 'bg-neutral-900 text-white font-semibold dark:bg-white dark:text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            Test Reminders
          </button>

          <button
            onClick={() => setActiveFilter('achievement')}
            className={`rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeFilter === 'achievement'
                ? 'bg-neutral-900 text-white font-semibold dark:bg-white dark:text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            Achievements
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-2 text-xs bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-800/40">
          <span className="text-neutral-500 dark:text-neutral-400 font-medium">
            {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 font-semibold text-neutral-800 hover:text-black dark:text-neutral-200 dark:hover:text-white cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="flex items-center gap-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
                No notifications in this tab
              </h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-xs">
                You're completely caught up with your study alerts, upcoming mocks, and milestones!
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isCelebratoryMilestone =
                notif.category === 'milestone' || notif.isMilestoneBadge || notif.celebratory;
              const isCelebratingThis = celebrationEffectActive === notif.id;

              return (
                <div
                  key={notif.id}
                  className={`relative rounded-2xl border p-4 transition-all shadow-xs ${
                    isCelebratoryMilestone ? 'celebrate-alert-item' : ''
                  } ${
                    notif.unread
                      ? 'border-neutral-300/90 bg-white dark:border-neutral-700 dark:bg-neutral-800/90 ring-1 ring-neutral-200/50 dark:ring-neutral-700/50'
                      : 'border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900/60 opacity-90'
                  }`}
                >
                  {/* Celebratory floating confetti particle dots when active */}
                  {isCelebratingThis && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                      <span className="absolute left-4 top-2 h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                      <span className="absolute right-6 top-3 h-2 w-2 rounded-full bg-orange-500 animate-ping delay-100" />
                      <span className="absolute left-1/2 bottom-3 h-2.5 w-2.5 rounded-full bg-yellow-400 animate-ping delay-200" />
                      <span className="absolute right-12 bottom-4 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping delay-150" />
                    </div>
                  )}

                  {/* Header row inside alert */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-xs ${
                          isCelebratoryMilestone
                            ? 'bg-amber-500 text-white border-amber-600 dark:bg-amber-400 dark:text-neutral-950'
                            : 'bg-white border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800'
                        }`}
                      >
                        {getCategoryIcon(notif.category)}
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${getCategoryBadge(
                          notif.category
                        )}`}
                      >
                        {notif.badgeLabel || notif.category.replace('_', ' ').toUpperCase()}
                      </span>

                      {/* Celebratory Star Sparkle Icon */}
                      {isCelebratoryMilestone && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 animate-sparkle-twinkle">
                          <Sparkles className="h-3 w-3" />
                          <span>Specialized Milestone</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                        <Clock className="h-3 w-3" />
                        {notif.timeAgo}
                      </span>
                      {notif.unread && (
                        <span className="h-2 w-2 rounded-full bg-orange-500" title="Unread" />
                      )}
                    </div>
                  </div>

                  {/* Title & Body */}
                  <h4 className="mt-2.5 text-sm font-bold text-neutral-900 dark:text-white">
                    {notif.title}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                    {notif.message}
                  </p>

                  {/* SPECIALIZED 'MILESTONE' ACHIEVEMENT BADGE EMBLEM */}
                  {isCelebratoryMilestone && (
                    <MilestoneBadgeCard
                      notif={notif}
                      onCelebrate={handleTriggerCelebrate}
                      onViewCredential={(n) => setSelectedMilestoneCredential(n)}
                    />
                  )}

                  {/* Action button if specified */}
                  {notif.actionLabel && (
                    <div className="mt-3.5 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                      <button
                        onClick={() => handleActionClick(notif)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-orange-600 dark:text-neutral-100 dark:hover:text-orange-400 group cursor-pointer"
                      >
                        <span>{notif.actionLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>

                      {notif.unread && (
                        <button
                          onClick={() => onMarkAsRead(notif.id)}
                          className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 p-4 text-center text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-900/50">
          <span>YASH Study Engine · Synchronized with TNPSC Syllabus Gateways</span>
        </div>
      </div>

      {/* MILESTONE CREDENTIAL DETAILS MODAL */}
      {selectedMilestoneCredential && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-amber-300 bg-white p-6 shadow-2xl dark:border-amber-500/50 dark:bg-neutral-900 text-center space-y-4">
            <button
              onClick={() => setSelectedMilestoneCredential(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Classical Laurel Insignia */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-linear-to-b from-amber-300 via-amber-400 to-amber-600 text-amber-950 shadow-lg ring-4 ring-amber-300/40">
              <Trophy className="h-8 w-8" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
                <Star className="h-3 w-3 fill-current" />
                <span>OFFICIAL CURRICULUM MILESTONE</span>
              </span>
              <h3 className="mt-2 text-xl font-bold font-serif text-neutral-900 dark:text-white">
                {selectedMilestoneCredential.moduleTitle || selectedMilestoneCredential.title}
              </h3>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {selectedMilestoneCredential.courseName || 'TNPSC Group 2 & 2A Master Track'}
              </p>
            </div>

            {/* Credential Details Card */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-left dark:border-neutral-800 dark:bg-neutral-800/60 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500">Aspirant Name</span>
                <span className="font-bold text-neutral-900 dark:text-white">Yashika</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500">Tier Credential</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {selectedMilestoneCredential.badgeTier || 'Gold'} Excellence
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500">Milestone Reward</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{selectedMilestoneCredential.xpBonus || 200} XP Added
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Verification Seal</span>
                <span className="font-mono text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                  YASH-TNPSC-{selectedMilestoneCredential.id.slice(-6).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedMilestoneCredential(null);
                  handleTriggerCelebrate(selectedMilestoneCredential);
                }}
                className="flex-1 rounded-xl bg-orange-500 py-3 text-xs font-bold text-white hover:bg-orange-600 transition-all cursor-pointer shadow-xs"
              >
                Celebrate Achievement 🎉
              </button>
              <button
                onClick={() => setSelectedMilestoneCredential(null)}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
