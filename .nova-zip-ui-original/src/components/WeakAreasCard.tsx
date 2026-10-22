import React from 'react';
import { AlertCircle, ArrowRight, Sparkles, Target } from 'lucide-react';
import { WeakArea } from '../types';

interface WeakAreasCardProps {
  weakAreas: WeakArea[];
  onPracticeTopic: (topic: string) => void;
}

export const WeakAreasCard: React.FC<WeakAreasCardProps> = ({
  weakAreas,
  onPracticeTopic,
}) => {
  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white sm:text-xl">
            Focus & Remediation Areas
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Automated diagnostic detection based on recent tests & practice attempts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {weakAreas.map((area) => (
          <div
            key={area.id}
            className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-xs transition-all hover:border-orange-300 dark:border-neutral-800 dark:bg-neutral-800"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                  {area.subject}
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    area.status === 'Needs practice'
                      ? 'text-red-600 dark:text-red-400'
                      : area.status === 'Needs revision'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {area.masteryPercentage}% mastery
                </span>
              </div>

              <h3 className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">
                {area.topic}
              </h3>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                {area.status} • {area.suggestedAction}
              </p>
            </div>

            <button
              onClick={() => onPracticeTopic(area.topic)}
              className="mt-3.5 flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-100 active:scale-98 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/70"
            >
              <span>Practice now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
