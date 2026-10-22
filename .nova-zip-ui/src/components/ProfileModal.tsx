import React, { useState } from 'react';
import {
  X,
  User,
  Award,
  Flame,
  Clock,
  Sparkles,
  Check,
  Shield,
  Mail,
  Phone,
  Bell,
  BellOff,
} from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onOpenOnboarding?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onUpdateProfile,
  onOpenOnboarding,
}) => {
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [email, setEmail] = useState(profile.email || 'yashika.aspirant@example.com');
  const [phone, setPhone] = useState(profile.phone || '+91 98765 43210');
  const [emojiAvatar, setEmojiAvatar] = useState(profile.emojiAvatar || '🦉');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    profile.notificationsEnabled ?? true
  );
  const [emailNotifications, setEmailNotifications] = useState(
    profile.emailNotifications ?? true
  );
  const [smsNotifications, setSmsNotifications] = useState(
    profile.smsNotifications ?? false
  );
  const [level, setLevel] = useState(profile.level);
  const [isSaved, setIsSaved] = useState(false);

  const emojiList = ['🦉', '🦁', '🐯', '🦅', '🚀', '⚡', '🎯', '🌟', '🧠', '🏆', '📚', '🌺'];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: name.trim(),
      handle: handle.trim(),
      email: email.trim(),
      phone: phone.trim(),
      emojiAvatar,
      avatarText: emojiAvatar || name.trim().charAt(0).toUpperCase() || 'Y',
      notificationsEnabled,
      emailNotifications,
      smsNotifications,
      level,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4.5 border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <User className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Student Profile & Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Avatar Preview & Mascot Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-tr from-orange-500 to-amber-500 text-3xl shadow-md ring-4 ring-orange-100 dark:ring-neutral-800">
                {emojiAvatar || name.charAt(0).toUpperCase() || 'Y'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-neutral-900 dark:text-white truncate">{name}</p>
                  <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    {profile.exam}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{handle}</p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                  <Sparkles className="h-3 w-3" />
                  <span>{level} Candidate · {profile.currentPhase} Phase</span>
                </div>
              </div>
            </div>

            {/* Mascot Character Picker */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Profile Emoji Character Mascot
              </label>
              <div className="flex flex-wrap gap-1.5">
                {emojiList.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmojiAvatar(em)}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all ${
                      emojiAvatar === em
                        ? 'bg-orange-500 shadow-xs scale-110 ring-2 ring-orange-300 dark:ring-orange-800'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Basic Info Fields */}
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Yashika"
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Handle / Username
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. @yashika_tnpsc"
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>

            {/* Email Address Field */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <Mail className="h-3.5 w-3.5 text-orange-500" />
                <span>Email Address</span>
              </label>
              <div className="relative mt-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-3 pr-3 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                Used for weekly progress reports, mock exam scorecards, and account alerts.
              </p>
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <Phone className="h-3.5 w-3.5 text-orange-500" />
                <span>Phone Number</span>
              </label>
              <div className="relative mt-1">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-3 pr-3 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                Used for daily study streak reminders and milestone test schedule alerts.
              </p>
            </div>
          </div>

          {/* Notification On/Off Section */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 rounded-xl p-2 transition-colors ${
                    notificationsEnabled
                      ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400'
                      : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                  }`}
                >
                  {notificationsEnabled ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      Learning Notifications
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                        notificationsEnabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                      }`}
                    >
                      {notificationsEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    {notificationsEnabled
                      ? 'Reminders are active for daily queue, mock tests, and streak warnings.'
                      : 'All learning reminders and alerts are currently muted.'}
                  </p>
                </div>
              </div>

              {/* Master Notification Switch Button */}
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                aria-label="Toggle notifications on and off"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-orange-400/50 ${
                  notificationsEnabled ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sub-channel options when notifications are enabled */}
            {notificationsEnabled && (
              <div className="mt-3.5 space-y-2 border-t pt-3 border-neutral-200/80 dark:border-neutral-700/80">
                <label className="flex items-center justify-between cursor-pointer rounded-xl p-1.5 hover:bg-neutral-100/70 dark:hover:bg-neutral-700/40">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      Email Daily Digest & Test Results
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-neutral-300 text-orange-500 focus:ring-orange-400 dark:border-neutral-700"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer rounded-xl p-1.5 hover:bg-neutral-100/70 dark:hover:bg-neutral-700/40">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      SMS & WhatsApp Milestone Alerts
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsNotifications}
                    onChange={(e) => setSmsNotifications(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-neutral-300 text-orange-500 focus:ring-orange-400 dark:border-neutral-700"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Proficiency Level */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Proficiency Level
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`rounded-xl border p-2 text-xs font-semibold transition-all ${
                    level === lvl
                      ? 'border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-300'
                      : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Academic Highlights */}
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">Target Examination:</span>
              <span className="font-bold text-neutral-900 dark:text-white">{profile.exam}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">Total XP Points:</span>
              <span className="font-bold text-neutral-900 dark:text-white">{profile.xp} XP</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">Active Daily Streak:</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">
                {profile.streakDays} Days 🔥
              </span>
            </div>

            {onOpenOnboarding && (
              <div className="border-t pt-2 border-neutral-200/60 dark:border-neutral-700/60">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOnboarding();
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-orange-100/70 px-3 py-2 text-xs font-bold text-orange-800 transition-colors hover:bg-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/60"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Retake TNPSC Diagnostic Setup</span>
                  </div>
                  <span>Restart →</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t pt-3 border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 active:scale-98"
            >
              {isSaved ? <Check className="h-4 w-4" /> : null}
              <span>{isSaved ? 'Saved!' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
