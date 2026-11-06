import React from 'react';
import {
  CheckCircle2,
  Lock,
  Trophy,
} from 'lucide-react';
import { UserProfile, TodayUnit } from '../../types';
import { AdaptiveRoadmapPanel, type AdaptiveRoadmapData, type AdaptiveRoadmapStep } from '../../components/AdaptiveRoadmapPanel';

interface JourneyViewProps {
  profile: UserProfile;
  todayUnits: TodayUnit[];
  adaptivePlan?: AdaptiveRoadmapData | null;
  onLaunchAdaptiveStep?: (step: AdaptiveRoadmapStep) => void;
}

const PHASE_ORDER: UserProfile['currentPhase'][] = [
  'Orientation', 'Foundation', 'Core', 'Exam Level', 'Advanced', 'Competitive', 'Exam Ready',
];

const PHASE_META: Record<UserProfile['currentPhase'], { roman: string; name: string; description: string; weeks: string; weekCount: number }> = {
  Orientation: { roman: 'I', name: 'Diagnostic Orientation', description: 'Initial benchmark assessment, syllabus calibration & diagnostic placement.', weeks: 'Week 0', weekCount: 1 },
  Foundation: { roman: 'II', name: 'Foundation Phase', description: 'Number systems, fundamental rights, Tamil Nadu chronology, and mental math.', weeks: 'Weeks 1–8', weekCount: 8 },
  Core: { roman: 'III', name: 'Core Syllabus Mastery', description: 'Comprehensive general studies, state administrative machinery, and commercial math.', weeks: 'Weeks 9–16', weekCount: 8 },
  'Exam Level': { roman: 'IV', name: 'Exam-Level Multi-Statements', description: 'Full-length TNPSC Group 2 & 2A difficulty, assertion-reason items, and PYQ sets.', weeks: 'Weeks 17–22', weekCount: 6 },
  Advanced: { roman: 'V', name: 'Advanced Speed & Penalties', description: 'Negative marking optimization, rapid formula heuristics, and speed sprints.', weeks: 'Weeks 23–26', weekCount: 4 },
  Competitive: { roman: 'VI', name: 'Competitive Percentile Sprints', description: 'Cohort ranking benchmarks, state-wide aspirant percentiles, and revision marathons.', weeks: 'Weeks 27–30', weekCount: 4 },
  'Exam Ready': { roman: 'VII', name: 'Commission Exam-Ready', description: 'Full 200-question timed mock marathons with official OMR simulation.', weeks: 'Weeks 31–32', weekCount: 2 },
};

/**
 * This used to render a fully hardcoded 7-phase roadmap with fabricated
 * progress numbers (100/42/0/...) regardless of the signed-in learner --
 * the real curriculum phase/week (profile.currentPhase, currentWeek, from
 * /api/dashboard via useAppData) was already being fetched elsewhere in the
 * app and simply never passed down to this view. The phase names and
 * descriptions are static curriculum architecture (not learner data), but
 * which phase is COMPLETED/CURRENT/LOCKED and how far into it the learner
 * is now come from the real profile.
 */
export const JourneyView: React.FC<JourneyViewProps> = ({ profile, todayUnits, adaptivePlan, onLaunchAdaptiveStep }) => {
  const currentPhaseIndex = Math.max(0, PHASE_ORDER.indexOf(profile.currentPhase));

  const phases = PHASE_ORDER.map((phaseKey, index) => {
    const meta = PHASE_META[phaseKey];
    const status = index < currentPhaseIndex ? 'COMPLETED' : index === currentPhaseIndex ? 'CURRENT' : 'LOCKED';
    const progress =
      status === 'COMPLETED' ? 100
      : status === 'LOCKED' ? 0
      : Math.min(100, Math.round(((profile.currentWeek || 1) / meta.weekCount) * 100));
    return { ...meta, status, progress };
  });

  const activePhase = phases[currentPhaseIndex] ?? phases[0];

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
              <div className="font-bold">Active Phase {activePhase.roman}: {profile.currentPhase}</div>
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">
                Week {profile.currentWeek} of {activePhase.weekCount} · {activePhase.progress}% Complete
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdaptiveRoadmapPanel plan={adaptivePlan} onLaunchStep={onLaunchAdaptiveStep} />

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

      {/* Today's real adaptive queue, in place of the old hardcoded 7-day schedule */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              ACTIVE PHASE SPRINT
            </div>
            <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
              {profile.currentPhase} Phase · Today's Adaptive Queue
            </h3>
          </div>
          <span className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-700 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-300">
            Day {profile.currentDay}
          </span>
        </div>

        {todayUnits.length === 0 ? (
          <p className="py-4 text-center text-xs text-stone-500 dark:text-stone-400">
            No adaptive activities are queued for today yet.
          </p>
        ) : (
          <div className="space-y-2">
            {todayUnits.map((unit, index) => {
              const isCompleted = unit.status === 'COMPLETED';
              const isCurrent = unit.status === 'IN_PROGRESS';

              return (
                <div
                  key={unit.id}
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
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <span className="font-serif font-bold text-stone-900 dark:text-stone-100 truncate block">
                        {unit.title}
                      </span>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">
                        {unit.type} · {unit.estimatedMinutes}m
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
                    {unit.status.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
