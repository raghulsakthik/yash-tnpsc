import React, { useState } from 'react';
import {
  Award,
  Flame,
  Clock,
  Sparkles,
  ChevronRight,
  Check,
  Target,
  Edit2,
  Plus,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, DailyGoal } from '../types';
import { getUserLevelInfo, calculateDailyGoalProgress } from '../utils/learningStats';

interface ProgressPanelProps {
  profile: UserProfile;
  onOpenProfile: () => void;
  onUpdateDailyGoal?: (goal: DailyGoal) => void;
  onLogGoalProgress?: (amount: number) => void;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  profile,
  onOpenProfile,
  onUpdateDailyGoal,
  onLogGoalProgress,
}) => {
  const levelInfo = getUserLevelInfo(profile.xp);

  // Daily Goal state: fallback to default if not set
  const currentGoal: DailyGoal = profile.dailyGoal || {
    type: 'hours',
    target: 2,
    current: 1.5,
  };

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalType, setGoalType] = useState<'hours' | 'lessons'>(currentGoal.type);
  const [goalTarget, setGoalTarget] = useState<number>(currentGoal.target);

  const goalProgress = calculateDailyGoalProgress(currentGoal.current, currentGoal.target);

  // SVG Circular calculation for Main Overall XP Ring
  const size = 150;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * levelInfo.percentage) / 100;

  // SVG Circular calculation for Daily Goal Ring
  const goalSize = 92;
  const goalStrokeWidth = 7;
  const goalRadius = (goalSize - goalStrokeWidth) / 2;
  const goalCircumference = 2 * Math.PI * goalRadius;
  const goalStrokeDashoffset =
    goalCircumference - (goalCircumference * goalProgress.percentage) / 100;

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateDailyGoal) {
      onUpdateDailyGoal({
        type: goalType,
        target: goalTarget,
        current: Math.min(currentGoal.current, goalTarget),
      });
    }
    setIsEditingGoal(false);
  };

  const handleQuickAdd = () => {
    const increment = currentGoal.type === 'hours' ? 0.5 : 1;
    const newCurrent = Math.round((currentGoal.current + increment) * 10) / 10;

    if (onLogGoalProgress) {
      onLogGoalProgress(increment);
    } else if (onUpdateDailyGoal) {
      onUpdateDailyGoal({
        ...currentGoal,
        current: newCurrent,
      });
    }

    if (newCurrent >= currentGoal.target) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ea580c', '#f59e0b', '#10b981'],
      });
    }
  };

  const skills = [
    { name: 'Wireframing', pct: 88, color: 'bg-orange-500' },
    { name: 'Prototyping', pct: 65, color: 'bg-amber-500' },
    { name: 'User Flow', pct: 74, color: 'bg-emerald-500' },
    { name: 'Design Tokens', pct: 60, color: 'bg-blue-500' },
  ];

  const badges = [
    { title: 'First Wireframe', icon: '📐', earned: true },
    { title: '7-Day Streak', icon: '🔥', earned: true },
    { title: 'Quick Lab Ace', icon: '🧪', earned: true },
    { title: 'Sprint Finisher', icon: '⚡', earned: false },
  ];

  return (
    <aside
      className="flex flex-col gap-6 rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800 sm:p-6"
      aria-label="Student Progress"
    >
      {/* Header matching Image 1: "Progress" */}
      <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
          Progress
        </h2>
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
        >
          <span>Details</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Big Circular Progress Ring with (Y) inside, matching sketch */}
      <div className="flex flex-col items-center text-center">
        <div className="relative flex items-center justify-center">
          {/* Outer SVG Progress Ring */}
          <svg width={size} height={size} className="-rotate-90">
            {/* Background track circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              className="text-neutral-100 dark:text-neutral-700"
            />
            {/* Concentric inner subtle ring as in wireframe */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius - 8}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="transparent"
              className="text-orange-200 dark:text-orange-950"
            />
            {/* Active progress stroke */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#progressGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
          </svg>

          {/* Centered Avatar / Emoji Character */}
          <div className="absolute flex flex-col items-center justify-center">
            <div className="flex h-15 w-15 items-center justify-center rounded-full bg-linear-to-tr from-orange-500 to-amber-500 text-2xl font-black text-white shadow-md ring-4 ring-orange-100 dark:ring-neutral-700">
              {profile.emojiAvatar || profile.avatarText}
            </div>
            <span className="mt-1 text-[11px] font-bold text-orange-600 dark:text-orange-400">
              {levelInfo.percentage}%
            </span>
          </div>
        </div>

        {/* User Name & Level: "Yashika" and "Beginner." */}
        <div className="mt-2.5">
          <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {profile.name}
          </h3>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
            <Sparkles className="h-3 w-3" />
            <span>{levelInfo.level}</span>
          </div>
        </div>

        {/* XP Tier progress */}
        <div className="mt-3.5 w-full">
          <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            <span>Level XP</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {profile.xp} / {profile.nextLevelXp} XP
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-linear-to-r from-orange-500 to-amber-500 transition-all duration-500"
              style={{ width: `${(profile.xp / profile.nextLevelXp) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* NEW FEATURE: Daily Learning Goal with Dedicated Progress Ring */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 transition-all dark:border-neutral-700/80 dark:bg-neutral-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
              Daily Learning Goal
            </h4>
          </div>
          <button
            onClick={() => setIsEditingGoal(!isEditingGoal)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-neutral-700"
            title="Set Daily Learning Goal"
          >
            <Edit2 className="h-3 w-3" />
            <span>{isEditingGoal ? 'Cancel' : 'Set Goal'}</span>
          </button>
        </div>

        {/* Goal Edit Drawer */}
        {isEditingGoal ? (
          <form onSubmit={handleSaveGoal} className="mt-3.5 space-y-3 border-t pt-3 border-neutral-200 dark:border-neutral-700">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Goal Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGoalType('hours');
                    setGoalTarget(2);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium transition-all ${
                    goalType === 'hours'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Study Hours</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGoalType('lessons');
                    setGoalTarget(3);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium transition-all ${
                    goalType === 'lessons'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Lessons</span>
                </button>
              </div>
            </div>

            {/* Target Value Presets & Controls */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Target {goalType === 'hours' ? 'Hours / Day' : 'Lessons / Day'}
              </label>
              <div className="flex items-center gap-1.5">
                {(goalType === 'hours' ? [1, 1.5, 2, 3, 4] : [2, 3, 4, 5, 6]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGoalTarget(val)}
                    className={`flex-1 rounded-lg py-1 text-xs font-semibold transition-all ${
                      goalTarget === val
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-white text-neutral-600 border border-neutral-200 hover:border-orange-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {val}{goalType === 'hours' ? 'h' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingGoal(false)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              >
                Close
              </button>
              <button
                type="submit"
                className="rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-600"
              >
                Save Goal
              </button>
            </div>
          </form>
        ) : (
          /* Goal Visualization Ring & Stats */
          <div className="mt-3 flex items-center gap-4">
            {/* Circular Progress Ring for Daily Goal */}
            <div className="relative flex shrink-0 items-center justify-center">
              <svg width={goalSize} height={goalSize} className="-rotate-90">
                <circle
                  cx={goalSize / 2}
                  cy={goalSize / 2}
                  r={goalRadius}
                  stroke="currentColor"
                  strokeWidth={goalStrokeWidth}
                  fill="transparent"
                  className="text-neutral-200 dark:text-neutral-700"
                />
                <circle
                  cx={goalSize / 2}
                  cy={goalSize / 2}
                  r={goalRadius}
                  stroke="url(#goalGradient)"
                  strokeWidth={goalStrokeWidth}
                  strokeDasharray={goalCircumference}
                  strokeDashoffset={goalStrokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {goalProgress.percentage}%
                </span>
                <span className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400">
                  {goalProgress.isCompleted ? 'Done' : 'Today'}
                </span>
              </div>
            </div>

            {/* Goal Info & Quick Action */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  {currentGoal.current} / {currentGoal.target}{' '}
                  {currentGoal.type === 'hours' ? 'hrs' : 'lessons'}
                </span>
                {goalProgress.isCompleted && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                )}
              </div>

              <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                {goalProgress.isCompleted
                  ? '🎉 Daily goal achieved!'
                  : `${goalProgress.remaining} ${
                      currentGoal.type === 'hours' ? 'hrs' : 'lessons'
                    } left to reach target`}
              </p>

              <button
                type="button"
                onClick={handleQuickAdd}
                className="mt-2 flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-orange-600 shadow-2xs hover:bg-orange-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-orange-400 dark:hover:bg-neutral-700"
              >
                <Plus className="h-3 w-3" />
                <span>
                  Log +{currentGoal.type === 'hours' ? '30m' : '1 Lesson'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stat Pill Highlights */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3 dark:border-neutral-700/80 dark:bg-neutral-800">
          <div className="rounded-xl bg-orange-100 p-2 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
            <Flame className="h-4 w-4 fill-orange-500" />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-900 dark:text-white">
              {profile.streakDays} Days
            </div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Current Streak</div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3 dark:border-neutral-700/80 dark:bg-neutral-800">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-900 dark:text-white">
              {profile.hoursSpent} hrs
            </div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Study Time</div>
          </div>
        </div>
      </div>

      {/* Skills Mastery breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Skill Proficiency
        </h4>
        <div className="space-y-2.5">
          {skills.map((skill) => (
            <div key={skill.name}>
              <div className="flex justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                <span>{skill.name}</span>
                <span className="font-semibold">{skill.pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                <div
                  className={`h-full rounded-full ${skill.color}`}
                  style={{ width: `${skill.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges Earned */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Recent Badges
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {badges.map((b) => (
            <div
              key={b.title}
              className={`flex items-center gap-2 rounded-xl p-2 border ${
                b.earned
                  ? 'border-orange-200/60 bg-orange-50/40 text-neutral-900 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-neutral-100'
                  : 'border-neutral-200 bg-neutral-50/50 opacity-60 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800/40'
              }`}
            >
              <span className="text-lg">{b.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs font-semibold">{b.title}</div>
                <div className="text-[10px] text-neutral-400">
                  {b.earned ? 'Earned' : 'Locked'}
                </div>
              </div>
              {b.earned && <Check className="h-3 w-3 text-orange-600 dark:text-orange-400" />}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
