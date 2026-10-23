import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Mail,
  Phone,
  Bell,
  BellOff,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Award,
  Flame,
  Shield,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, SubjectMastery, WeakArea } from '../types';
import { BrandLogo } from './BrandLogo';

interface OnboardingModalProps {
  isOpen: boolean;
  profile?: UserProfile | null;
  onComplete: (data: {
    profile: Partial<UserProfile>;
    updatedMastery?: SubjectMastery[];
    updatedWeakAreas?: WeakArea[];
  }) => void;
  onClose?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  profile,
  onComplete,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Programme & Exam
  const [programme, setProgramme] = useState<'TNPSC' | 'UPSC' | 'SSC' | 'Banking' | 'Railways'>('TNPSC');
  const [examTrack, setExamTrack] = useState<string>('TNPSC Group 2 & 2A');

  // Step 2: Subject Proficiencies in TNPSC Group 2 & 2A
  const [proficiencies, setProficiencies] = useState<Record<string, 'Beginner' | 'Developing' | 'Strong' | 'Mastered'>>({
    'General Studies': 'Developing',
    'Aptitude & Mental Ability': 'Beginner',
    'Indian Polity & Constitution': 'Beginner',
    'History & Culture of Tamil Nadu': 'Strong',
    'General English / Tamil': 'Strong',
    'Current Events & Administration': 'Developing',
  });

  // Step 3: Contact & Alerts
  const [name, setName] = useState(profile?.name || '');
  const [handle, setHandle] = useState(profile?.handle || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  // Step 4: Emoji Character
  const emojiOptions = [
    { emoji: '🦉', label: 'Scholar Owl', meaning: 'Wisdom & Strategy' },
    { emoji: '🦁', label: 'Brave Lion', meaning: 'Courage & Focus' },
    { emoji: '🐯', label: 'Agile Tiger', meaning: 'Speed & Power' },
    { emoji: '🦅', label: 'Sharp Eagle', meaning: 'High Vision' },
    { emoji: '🚀', label: 'Aspirant Rocket', meaning: 'Fast Progress' },
    { emoji: '⚡', label: 'Lightning Mind', meaning: 'Rapid Heuristics' },
    { emoji: '🎯', label: 'Target Bullseye', meaning: 'Top Rank Aim' },
    { emoji: '🌟', label: 'Starlight', meaning: 'Excellence' },
    { emoji: '🧠', label: 'Concept Brain', meaning: 'Deep Mastery' },
    { emoji: '🏆', label: 'Trophy Champion', meaning: 'Exam Ready' },
    { emoji: '📚', label: 'Book Maven', meaning: 'High Retention' },
    { emoji: '🌺', label: 'Tamil Lotus', meaning: 'Calm & Resilience' },
  ];
  const [selectedEmoji, setSelectedEmoji] = useState('🦉');

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 4) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    } else {
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const finishOnboarding = () => {
    // Self-assessment is a preference signal only. It does not manufacture
    // mastery or weak-topic scores; the adaptive diagnostic remains the
    // authoritative placement source.
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    onComplete({
      profile: {
        name: name.trim() || profile?.name || 'Learner',
        handle: handle.trim() || profile?.handle || '@learner',
        email: email.trim() || profile?.email,
        phone: phone.trim() || profile?.phone,
        emojiAvatar: selectedEmoji,
        avatarText: selectedEmoji || name.charAt(0).toUpperCase() || profile?.avatarText || 'L',
        programme,
        exam: examTrack,
        examTrack,
        notificationsEnabled,
        emailNotifications,
        smsNotifications,
        subjectProficiencies: proficiencies,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Dim backdrop */}
      <div className="fixed inset-0 bg-neutral-950/75 backdrop-blur-sm transition-opacity" />

      {/* Modal Card */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header / Stepper Bar */}
        <div className="border-b px-6 py-5 border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo
                size="md"
                showWordmark={true}
                subtitle={`STEP ${step} OF 4 · TNPSC ASPIRANT SETUP`}
              />
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Skip Setup
              </button>
            )}
          </div>

          {/* Stepper progress indicator */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= step
                    ? 'bg-orange-500 shadow-2xs'
                    : 'bg-neutral-200 dark:bg-neutral-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP 1: Programme & Exam Selection */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Step 1: Programme Selection
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                  Which examination programme are you preparing for?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  YASH delivers curriculum-aligned PYQs, milestone tests, and adaptive study queues for your chosen board:
                </p>
              </div>

              {/* Programme Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  {
                    id: 'TNPSC',
                    title: 'TNPSC',
                    subtitle: 'Tamil Nadu Public Service Commission',
                    badge: 'Recommended · Group 2 & 2A',
                    isRecommended: true,
                  },
                  {
                    id: 'UPSC',
                    title: 'UPSC Civil Services',
                    subtitle: 'IAS, IPS & Central Civil Services',
                    badge: 'General Studies Track',
                    isRecommended: false,
                  },
                  {
                    id: 'SSC',
                    title: 'SSC CGL & CHSL',
                    subtitle: 'Staff Selection Commission',
                    badge: 'Aptitude & Reasoning',
                    isRecommended: false,
                  },
                  {
                    id: 'Banking',
                    title: 'Banking & IBPS',
                    subtitle: 'PO, Clerical & Insurance Exams',
                    badge: 'Quantitative Track',
                    isRecommended: false,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setProgramme(item.id as any);
                      if (item.id === 'TNPSC') {
                        setExamTrack('TNPSC Group 2 & 2A');
                      } else {
                        setExamTrack(`${item.id} Prelims`);
                      }
                    }}
                    className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                      programme === item.id
                        ? 'border-orange-500 bg-orange-50/70 shadow-xs ring-1 ring-orange-500 dark:border-orange-500 dark:bg-orange-950/30'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">
                          {item.title}
                        </span>
                        {item.isRecommended && (
                          <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {item.subtitle}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                        {item.badge}
                      </span>
                      {programme === item.id && (
                        <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Sub-track options when TNPSC is chosen */}
              {programme === 'TNPSC' && (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    Select Target TNPSC Examination Track:
                  </span>
                  <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      'TNPSC Group 2 & 2A',
                      'TNPSC Group 1 (Executive)',
                      'TNPSC Group 4 & VAO',
                    ].map((track) => (
                      <button
                        key={track}
                        type="button"
                        onClick={() => setExamTrack(track)}
                        className={`rounded-xl border p-3 text-xs font-semibold text-left transition-all ${
                          examTrack === track
                            ? 'border-orange-500 bg-white text-orange-700 shadow-2xs dark:border-orange-500 dark:bg-neutral-800 dark:text-orange-300'
                            : 'border-neutral-200 bg-white/60 text-neutral-600 hover:bg-white dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-300'
                        }`}
                      >
                        <div>{track}</div>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          {track.includes('Group 2') ? 'Combined Prelims + Mains' : 'Prelims Focus'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Subject Proficiencies in TNPSC Group 2 & 2A */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Step 2: Subject Proficiencies ({examTrack})
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                  Rate your starting level across each syllabus subject
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  YASH prioritizes your daily study queue and identifies weak topics based on these ratings:
                </p>
              </div>

              <div className="space-y-3">
                {Object.entries(proficiencies).map(([subj, lvl]) => (
                  <div
                    key={subj}
                    className="flex flex-col gap-2 rounded-2xl border border-neutral-200/90 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                        {subj}
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        {subj.includes('Aptitude')
                          ? 'Percentages, LCM-HCF, Mental Math, Reasoning'
                          : subj.includes('Polity')
                          ? 'Articles, Preamble, Constitutional Writs, Amendments'
                          : subj.includes('Tamil Nadu')
                          ? 'Thirukkural, Dravidian Movement, Sangam History'
                          : subj.includes('English')
                          ? 'Grammar, Reading Comprehension, Vocab'
                          : 'General Studies Syllabus'}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {(['Beginner', 'Developing', 'Strong', 'Mastered'] as const).map((grade) => (
                        <button
                          key={grade}
                          type="button"
                          onClick={() =>
                            setProficiencies((prev) => ({
                              ...prev,
                              [subj]: grade,
                            }))
                          }
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                            lvl === grade
                              ? grade === 'Beginner'
                                ? 'bg-red-500 text-white shadow-2xs'
                                : grade === 'Developing'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : grade === 'Strong'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Email, Phone & Study Notifications */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Step 3: Contact Details & Study Alerts
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                  Set up your email, phone, and notification preferences
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Keep your daily streak safe with automated alerts and test scorecard delivery:
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Email Address */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    <Mail className="h-3.5 w-3.5 text-orange-500" />
                    <span>Email Address (for test reports & weekly progress)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="aspirant@gmail.com"
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                  <p className="mt-1 text-[11px] text-neutral-400">
                    We will send official TNPSC syllabus updates and diagnostic test breakdowns here.
                  </p>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    <Phone className="h-3.5 w-3.5 text-orange-500" />
                    <span>Phone Number (for streak warnings & test reminders)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Used for daily queue reminders so you never break your active study streak.
                  </p>
                </div>

                {/* Notification On/Off Switch */}
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-xl p-2 ${
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
                            ? 'Study notifications and streak reminders enabled'
                            : 'Notifications muted'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={notificationsEnabled}
                      aria-label="Toggle notifications on and off"
                      onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                        notificationsEnabled ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
                          notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {notificationsEnabled && (
                    <div className="mt-3.5 space-y-2 border-t pt-3 border-neutral-200/80 dark:border-neutral-700/80">
                      <label className="flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                        <span>Email scorecards & daily lesson digest</span>
                        <input
                          type="checkbox"
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                          className="h-4 w-4 rounded-sm border-neutral-300 text-orange-500 focus:ring-orange-400 dark:border-neutral-700"
                        />
                      </label>
                      <label className="flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                        <span>SMS / WhatsApp streak saver alerts</span>
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
              </div>
            </div>
          )}

          {/* STEP 4: Emoji Character Mascot & Profile Card */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Step 4: Emoji Mascot & Identity
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                  Pick your profile emoji mascot & finalize your name
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Your character mascot represents your focus persona throughout your preparation journey:
                </p>
              </div>

              {/* Emoji Grid */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Select Mascot Character:
                </label>
                <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
                  {emojiOptions.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(item.emoji)}
                      className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all ${
                        selectedEmoji === item.emoji
                          ? 'border-orange-500 bg-orange-50 shadow-xs ring-2 ring-orange-500/50 scale-105 dark:bg-orange-950/40'
                          : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800'
                      }`}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="mt-1 text-[10px] font-bold text-neutral-900 dark:text-white truncate w-full">
                        {item.label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Name & Handle */}
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
                    placeholder="Your Name"
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Aspirant Handle
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@handle"
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="rounded-2xl border border-orange-200 bg-linear-to-r from-orange-50 to-amber-50 p-4 dark:border-orange-950 dark:from-neutral-800 dark:to-neutral-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Live Student Profile Badge
                </span>
                <div className="mt-2.5 flex items-center gap-3.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr from-orange-500 to-amber-500 text-3xl shadow-md ring-2 ring-white dark:ring-neutral-700">
                    {selectedEmoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-neutral-900 dark:text-white">
                        {name || 'Aspirant'}
                      </h4>
                      <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                        {examTrack}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {handle} · {programme} Candidate
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-600 dark:text-neutral-300">
                      <span>Starter Tier: Foundation Phase</span>
                      <span>•</span>
                      <span>Level: Beginner</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between border-t px-6 py-4 border-neutral-100 dark:border-neutral-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-orange-600 active:scale-98"
          >
            <span>{step === 4 ? 'Launch Personalized Hub' : 'Next Step'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
