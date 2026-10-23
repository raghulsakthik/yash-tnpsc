import React, { useState } from 'react';
import { AlertTriangle, Clock, Brain, CheckCircle, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import { MistakeItem } from '../types';

interface MistakesViewProps {
  mistakes: MistakeItem[];
  onPractice: () => void;
}

export const MistakesView: React.FC<MistakesViewProps> = ({ mistakes, onPractice }) => {
  const [selectedType, setSelectedType] = useState<string>('all');

  const countByType = {
    CONCEPT_GAP: mistakes.filter((m) => m.mistakeType === 'CONCEPT_GAP').length * 4,
    CARELESS_ERROR: mistakes.filter((m) => m.mistakeType === 'CARELESS_ERROR').length * 4,
    TIME_PRESSURE: mistakes.filter((m) => m.mistakeType === 'TIME_PRESSURE').length * 5,
  };

  // A mistake only leaves this list once the learner actually answers it
  // correctly again (server-derived, via /api/mistakes/next) -- there is
  // no local "mark resolved" shortcut.
  const filtered = mistakes.filter((m) => {
    if (selectedType === 'all') return true;
    return m.mistakeType === selectedType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
              Personalized Mistake Engine
            </h2>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Intelligent mistake classification and targeted remedial drill generator
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>+75 XP per remediated mistake</span>
        </div>
      </div>

      {/* Mistake Classification Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          onClick={() => setSelectedType(selectedType === 'CONCEPT_GAP' ? 'all' : 'CONCEPT_GAP')}
          className={`flex items-center gap-3.5 rounded-3xl border p-5 text-left transition-all ${
            selectedType === 'CONCEPT_GAP'
              ? 'border-red-500 bg-red-50/60 shadow-xs dark:bg-red-950/30'
              : 'border-neutral-200 bg-white hover:border-red-300 dark:border-neutral-800 dark:bg-neutral-800'
          }`}
        >
          <div className="rounded-2xl bg-red-100 p-3 text-red-600 dark:bg-red-950 dark:text-red-400">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-neutral-900 dark:text-white">
              {countByType.CONCEPT_GAP}
            </div>
            <div className="text-xs font-bold text-red-600 dark:text-red-400">Concept Gaps</div>
            <div className="text-[10px] text-neutral-400">Need theoretical review</div>
          </div>
        </button>

        <button
          onClick={() => setSelectedType(selectedType === 'CARELESS_ERROR' ? 'all' : 'CARELESS_ERROR')}
          className={`flex items-center gap-3.5 rounded-3xl border p-5 text-left transition-all ${
            selectedType === 'CARELESS_ERROR'
              ? 'border-amber-500 bg-amber-50/60 shadow-xs dark:bg-amber-950/30'
              : 'border-neutral-200 bg-white hover:border-amber-300 dark:border-neutral-800 dark:bg-neutral-800'
          }`}
        >
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <RefreshCw className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-neutral-900 dark:text-white">
              {countByType.CARELESS_ERROR}
            </div>
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400">Careless Errors</div>
            <div className="text-[10px] text-neutral-400">Calculation & misread issues</div>
          </div>
        </button>

        <button
          onClick={() => setSelectedType(selectedType === 'TIME_PRESSURE' ? 'all' : 'TIME_PRESSURE')}
          className={`flex items-center gap-3.5 rounded-3xl border p-5 text-left transition-all ${
            selectedType === 'TIME_PRESSURE'
              ? 'border-blue-500 bg-blue-50/60 shadow-xs dark:bg-blue-950/30'
              : 'border-neutral-200 bg-white hover:border-blue-300 dark:border-neutral-800 dark:bg-neutral-800'
          }`}
        >
          <div className="rounded-2xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-neutral-900 dark:text-white">
              {countByType.TIME_PRESSURE}
            </div>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">Time Pressure</div>
            <div className="text-[10px] text-neutral-400">Rushed in final 5 minutes</div>
          </div>
        </button>
      </div>

      {/* Mistake Items */}
      <div className="space-y-3.5">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
          Active Remedial Items
        </h3>

        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between gap-4 rounded-3xl border border-neutral-200 bg-white p-5 transition-all dark:border-neutral-800 dark:bg-neutral-800 sm:flex-row sm:items-center"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                  {item.subject}
                </span>
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  {item.topic}
                </span>
                <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                  {item.mistakeType.replace('_', ' ')}
                </span>
              </div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                {item.questionTitle}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Failed {item.count} times in practice • Last recorded on {item.lastAttemptedDate}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onPractice}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-600 active:scale-95"
              >
                <span>Practice & Clear</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
