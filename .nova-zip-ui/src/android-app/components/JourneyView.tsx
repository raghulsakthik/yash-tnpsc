import React from 'react';
import {
  Compass,
  CheckCircle2,
  Lock,
  ArrowRight,
  Calendar,
  Sparkles,
  Trophy,
  Award,
  ChevronRight,
  Clock,
  BookOpen,
} from 'lucide-react';

export const JourneyView: React.FC = () => {
  const phases = [
    {
      roman: 'I',
      name: 'Diagnostic Orientation',
      status: 'COMPLETED',
      description: 'Initial benchmark assessment, syllabus calibration & diagnostic placement.',
      progress: 100,
      weeks: 'Week 0',
    },
    {
      roman: 'II',
      name: 'Foundation Phase',
      status: 'CURRENT',
      description: 'Number systems, fundamental rights, Tamil Nadu chronology, and mental math.',
      progress: 42,
      weeks: 'Weeks 1–8',
    },
    {
      roman: 'III',
      name: 'Core Syllabus Mastery',
      status: 'LOCKED',
      description: 'Comprehensive general studies, state administrative machinery, and commercial math.',
      progress: 0,
      weeks: 'Weeks 9–16',
    },
    {
      roman: 'IV',
      name: 'Exam-Level Multi-Statements',
      status: 'LOCKED',
      description: 'Full-length TNPSC Group 2 & 2A difficulty, assertion-reason items, and PYQ sets.',
      progress: 0,
      weeks: 'Weeks 17–22',
    },
    {
      roman: 'V',
      name: 'Advanced Speed & Penalties',
      status: 'LOCKED',
      description: 'Negative marking optimization, rapid formula heuristics, and speed sprints.',
      progress: 0,
      weeks: 'Weeks 23–26',
    },
    {
      roman: 'VI',
      name: 'Competitive Percentile Sprints',
      status: 'LOCKED',
      description: 'Cohort ranking benchmarks, state-wide aspirant percentiles, and revision marathons.',
      progress: 0,
      weeks: 'Weeks 27–30',
    },
    {
      roman: 'VII',
      name: 'Commission Exam-Ready',
      status: 'LOCKED',
      description: 'Full 200-question timed mock marathons with official omr simulation.',
      progress: 0,
      weeks: 'Weeks 31–32',
    },
  ];

  const weekSchedule = [
    { day: 'Day 1', type: 'Concept', title: 'Whole Numbers & Divisibility Rules', status: 'COMPLETED', duration: '25m' },
    { day: 'Day 2', type: 'Guided Practice', title: 'Number Systems & Prime Factorization', status: 'COMPLETED', duration: '30m' },
    { day: 'Day 3', type: 'Application', title: 'Percentages & Fraction Equivalents', status: 'CURRENT', duration: '20m' },
    { day: 'Day 4', type: 'Exam Practice', title: 'Successive Discounts & Margin Analysis', status: 'UPCOMING', duration: '35m' },
    { day: 'Day 5', type: 'PYQs', title: 'TNPSC Group 2 2024 Paper Deep Dive', status: 'UPCOMING', duration: '40m' },
    { day: 'Day 6', type: 'Speed + Revision', title: '5-Minute Mental Math Lab & Mistakes Engine', status: 'UPCOMING', duration: '25m' },
    { day: 'Day 7', type: 'Weekly Test', title: 'Foundation Milestone Gate Assessment', status: 'UPCOMING', duration: '45m' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 animate-in fade-in select-none">
      {/* Classical Academic Header */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              <span>CURRICULUM ARCHITECTURE</span>
              <span>·</span>
              <span>7-PHASE ROADMAP TO TNPSC RANK</span>
            </div>
            <h1 className="mt-1 font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              7-Phase Examination Journey
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-2xl">
              Strictly sequenced pedagogical progression from diagnostic orientation to commission exam-ready. Automatic gate tests control advancement between phases.
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-300 bg-amber-50/80 px-3.5 py-2.5 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 shadow-2xs shrink-0">
            <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="font-bold">Active Phase II: Foundation</div>
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">Week 1 of 8 · 42% Complete</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Phase Stepper Cards */}
      <div className="space-y-3">
        <h2 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 px-1">
          Progressive Academic Milestones
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {phases.map((phase) => {
            const isDone = phase.status === 'COMPLETED';
            const isCurrent = phase.status === 'CURRENT';

            return (
              <div
                key={phase.name}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                  isCurrent
                    ? 'border-amber-500 bg-linear-to-br from-amber-50/90 to-orange-50/40 shadow-xs dark:border-amber-500 dark:from-stone-900 dark:to-amber-950/20 ring-1 ring-amber-500/30'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-950/60 dark:bg-emerald-950/15'
                    : 'border-stone-200/80 bg-stone-50/60 opacity-60 dark:border-stone-800 dark:bg-stone-900/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-black text-xs text-amber-700 dark:text-amber-400">
                      Phase {phase.roman}
                    </span>
                    {isDone ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : isCurrent ? (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-2xs">
                        CURRENT
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-stone-400">
                        <Lock className="h-3 w-3" />
                        <span>{phase.weeks}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-stone-100 mt-2">
                    {phase.name}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400 line-clamp-2">
                    {phase.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200/50 dark:border-stone-800/60 space-y-1.5">
                  <div className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400">
                    <span>Phase Mastery</span>
                    <span className="font-mono font-bold">{phase.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/80 dark:bg-stone-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone
                          ? 'bg-emerald-500'
                          : isCurrent
                          ? 'bg-linear-to-r from-orange-500 to-amber-500'
                          : 'bg-stone-400'
                      }`}
                      style={{ width: `${phase.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Week 1 Sprint Schedule */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              ACTIVE PHASE SPRINT
            </div>
            <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
              Foundation Phase · 7-Day Curriculum Schedule
            </h3>
          </div>
          <span className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-700 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-300">
            Day 3 of 7
          </span>
        </div>

        <div className="space-y-2">
          {weekSchedule.map((item) => {
            const isCompleted = item.status === 'COMPLETED';
            const isCurrent = item.status === 'CURRENT';

            return (
              <div
                key={item.day}
                className={`flex items-center justify-between rounded-2xl border p-3 text-xs transition-all ${
                  isCurrent
                    ? 'border-amber-400 bg-amber-50/70 font-semibold shadow-2xs dark:border-amber-600 dark:bg-amber-950/30'
                    : isCompleted
                    ? 'border-stone-200 bg-stone-50/60 dark:border-stone-800 dark:bg-stone-850'
                    : 'border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : item.day.replace('Day ', '')}
                  </div>
                  <div className="min-w-0">
                    <span className="font-serif font-bold text-stone-900 dark:text-stone-100 truncate block">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">
                      {item.type} · {item.duration}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isCompleted
                      ? 'text-emerald-700 bg-emerald-100/70 dark:bg-emerald-950 dark:text-emerald-300'
                      : isCurrent
                      ? 'text-amber-800 bg-amber-200/70 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                      : 'text-stone-400'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
