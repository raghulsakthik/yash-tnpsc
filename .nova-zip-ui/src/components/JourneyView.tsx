import React from 'react';
import { Compass, CheckCircle2, Lock, Trophy } from 'lucide-react';

interface JourneyViewProps {
  progress?: {
    phases?: Array<{ id: string; name: string; description?: string; status: string; progress: number; durationWeeks?: number }>;
    weekDays?: Array<{ dayNumber: number; title: string; purpose?: string; status: string; targetMinutes?: number; completedRequired?: number; totalRequired?: number }>;
  } | null;
  active?: { phaseName?: string; weekNumber?: number; weekTitle?: string; dayNumber?: number } | null;
}

export const JourneyView: React.FC<JourneyViewProps> = ({ progress, active }) => {
  const phases = progress?.phases || [];
  const weekDays = progress?.weekDays || [];
  const currentPhase = phases.find((p) => p.status === 'CURRENT');
  const currentWeek = Number(active?.weekNumber || 1);
  const currentDay = Number(active?.dayNumber || 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">Adaptive Journey Roadmap</h2>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Automated phase gating from Diagnostic Orientation to Exam Ready</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-orange-100 px-3.5 py-1 text-xs font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
          <Trophy className="h-3.5 w-3.5" />
          <span>Active Phase: {currentPhase?.name || active?.phaseName || 'Orientation'} · Week {currentWeek}</span>
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-800 sm:p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">Examination Progression Phases</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {phases.map((phase, idx) => {
            const isDone = phase.status === 'COMPLETED';
            const isCurrent = phase.status === 'CURRENT';
            return (
              <div key={phase.id} className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${isCurrent ? 'border-orange-500 bg-orange-50/50 shadow-xs dark:border-orange-500 dark:bg-orange-950/20' : isDone ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-950 dark:bg-emerald-950/10' : 'border-neutral-200 bg-neutral-50/50 opacity-60 dark:border-neutral-700 dark:bg-neutral-800/40'}`}>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-400">Phase {idx + 1}</span>
                    {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : isCurrent ? <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold text-white">ACTIVE</span> : <Lock className="h-3.5 w-3.5 text-neutral-400" />}
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">{phase.name}</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">{phase.description || 'Adaptive curriculum phase.'}</p>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-neutral-400 mb-1"><span>Mastery Completion</span><span className="font-bold">{phase.progress}%</span></div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"><div className={`h-full rounded-full ${isDone ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${phase.progress}%` }} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-800 sm:p-6">
        <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-700">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Current Weekly Schedule</span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">{currentPhase?.name || active?.phaseName || 'Current Phase'} · Week {currentWeek} (7-Day Adaptive Cadence)</h3>
          </div>
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Day {currentDay} of {weekDays.length || 7} in Progress</span>
        </div>

        <div className="mt-4 space-y-2.5">
          {weekDays.map((day) => {
            const completed = day.status === 'COMPLETED';
            const current = day.status === 'CURRENT';
            const type = day.title;
            return (
              <div key={day.dayNumber} className={`flex items-center justify-between rounded-2xl border p-3.5 transition-colors ${current ? 'border-orange-400 bg-orange-50/40 dark:border-orange-800 dark:bg-orange-950/20' : completed ? 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-950 dark:bg-emerald-950/10' : 'border-neutral-200 bg-neutral-50/40 opacity-70 dark:border-neutral-700 dark:bg-neutral-800/40'}`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold ${completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : current ? 'bg-orange-500 text-white' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'}`}>{day.dayNumber}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{type}</span>
                      {completed && <span className="text-[10px] font-bold text-emerald-600">✓ Done</span>}
                      {current && <span className="text-[10px] font-bold text-orange-600">● Today's Focus</span>}
                    </div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white sm:text-sm">{day.title}</h4>
                  </div>
                </div>
                <span className="text-xs font-medium text-neutral-400">{completed ? 'Completed' : current ? 'In Progress' : 'Locked'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
