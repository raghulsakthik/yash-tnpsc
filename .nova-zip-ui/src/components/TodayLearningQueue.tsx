import React from 'react';
import {
  CheckCircle2,
  PlayCircle,
  Circle,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { TodayUnit } from '../types';

interface TodayLearningQueueProps {
  units: TodayUnit[];
  onToggleUnit: (unitId: string) => void;
  onLaunchUnit: (unit: TodayUnit) => void;
  curriculumContext?: {
    phaseName?: string;
    weekNumber?: number;
    dayNumber?: number;
  } | null;
}

export const TodayLearningQueue: React.FC<TodayLearningQueueProps> = ({
  units,
  onToggleUnit,
  onLaunchUnit,
  curriculumContext,
}) => {
  const completedCount = units.filter((u) => u.status === 'COMPLETED').length;
  const totalMinutes = units.reduce((acc, u) => acc + u.estimatedMinutes, 0);
  const phaseName = curriculumContext?.phaseName || 'Adaptive Phase';
  const weekNumber = curriculumContext?.weekNumber ?? 1;
  const dayNumber = curriculumContext?.dayNumber ?? 1;

  const getBadgeStyle = (type: TodayUnit['type']) => {
    switch (type) {
      case 'LESSON':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300';
      case 'GUIDED_PRACTICE':
      case 'PRACTICE':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300';
      case 'PYQ':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300';
      case 'REMEDIATION':
        return 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300';
      case 'TEST':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    }
  };

  return (
    <section className="space-y-3.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white sm:text-xl">
              Today's Learning Queue
            </h2>
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              {completedCount} of {units.length} Done
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Adaptive sequence for {phaseName} · Week {weekNumber} · Day {dayNumber} (~{totalMinutes} mins total)
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <Clock className="h-3.5 w-3.5 text-orange-500" />
          <span>Estimated: {totalMinutes}m study</span>
        </div>
      </div>

      <div className="divide-y divide-neutral-100 overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-xs dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-800">
        {units.map((unit, index) => {
          const isDone = unit.status === 'COMPLETED';
          const isInProgress = unit.status === 'IN_PROGRESS';

          return (
            <div
              key={unit.id}
              className={`group flex items-center justify-between p-4 transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/60 ${
                isDone ? 'bg-neutral-50/40 dark:bg-neutral-900/40' : ''
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1 pr-3">
                {/* Status Toggle Button */}
                <button
                  type="button"
                  onClick={() => onToggleUnit(unit.id)}
                  disabled={isDone}
                  className="mt-0.5 shrink-0 text-neutral-400 transition-colors hover:text-orange-500"
                  aria-label={isDone ? 'Completed' : 'Mark completed'}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-100 dark:text-emerald-400 dark:fill-emerald-950" />
                  ) : isInProgress ? (
                    <PlayCircle className="h-5 w-5 text-orange-500 fill-orange-50 dark:fill-orange-950" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(
                        unit.type
                      )}`}
                    >
                      {unit.type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {unit.subject}
                    </span>
                    <span className="text-[10px] text-neutral-400">• {unit.estimatedMinutes}m</span>
                  </div>

                  <h3
                    className={`mt-1 text-sm font-semibold truncate ${
                      isDone
                        ? 'text-neutral-500 line-through decoration-neutral-300 dark:text-neutral-400'
                        : 'text-neutral-900 dark:text-white'
                    }`}
                  >
                    {unit.title}
                  </h3>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onLaunchUnit(unit)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                  isDone
                    ? 'border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700'
                    : isInProgress
                    ? 'bg-orange-500 text-white shadow-xs hover:bg-orange-600'
                    : 'border border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900/40 dark:text-orange-300 dark:hover:bg-neutral-700'
                }`}
              >
                <span>{isDone ? 'Review' : isInProgress ? 'Continue' : 'Start'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
