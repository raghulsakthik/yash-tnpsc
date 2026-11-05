import React from 'react';
import { AlertTriangle, BookOpen, Clock3, Gauge, RefreshCw, Target } from 'lucide-react';

export interface AdaptiveRoadmapStep {
  stepNumber: number;
  type: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  chapterName?: string;
  estimatedMinutes: number;
  reason: string;
  classification: string;
  accuracy: number;
  mastery: number;
  weakestPrerequisite?: { topicId: string; accuracy: number } | null;
}

export interface AdaptiveRoadmapData {
  learnerId: string;
  syllabusOrder: string[];
  steps: AdaptiveRoadmapStep[];
  topicInsights?: Array<{
    topicId: string;
    topicName: string;
    subjectName: string;
    classification: string;
    classificationReason: string;
    action: string;
    reason: string;
    accuracy: number;
    mastery: number;
    attemptCount: number;
    weakestPrerequisite?: { topicId: string; accuracy: number } | null;
  }>;
}

const actionLabel: Record<string, string> = {
  ADVANCE: 'Ready to advance',
  PRACTICE: 'Practice',
  TIMED_PRACTICE: 'Timed practice',
  LESSON: 'Relearn concept',
  PREREQUISITE_LESSON: 'Fix prerequisite first',
  REASSESSMENT: 'Check understanding',
  MEMORY_ECHO: 'Memory recall',
  REVISION: 'Revision',
  MINI_ASSESSMENT: 'Mini assessment',
};

const actionTone: Record<string, string> = {
  PREREQUISITE_LESSON: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  LESSON: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  REVISION: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300',
  MEMORY_ECHO: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300',
};

export const AdaptiveRoadmapPanel: React.FC<{ plan?: AdaptiveRoadmapData | null }> = ({ plan }) => {
  const steps = plan?.steps ?? [];
  const totalMinutes = steps.reduce((sum, step) => sum + Number(step.estimatedMinutes || 0), 0);
  const remediationCount = steps.filter((step) => ['PREREQUISITE_LESSON', 'LESSON', 'REVISION', 'MEMORY_ECHO'].includes(step.type)).length;

  return (
    <section className="space-y-3 rounded-3xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <Target className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Learner-specific route</span>
          </div>
          <h3 className="mt-1 text-base font-bold text-neutral-900 dark:text-white">Your adaptive study roadmap</h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">The order changes as your answers, speed, retention and prerequisite mastery change.</p>
        </div>
        <div className="flex gap-2 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800"><BookOpen className="h-3 w-3" /> {steps.length} steps</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800"><Clock3 className="h-3 w-3" /> ~{totalMinutes} min</span>
        </div>
      </div>

      {!plan ? (
        <p className="rounded-2xl bg-neutral-50 p-4 text-xs text-neutral-500 dark:bg-neutral-800">Your adaptive roadmap is not available right now. Refresh after signing in to sync your learning data.</p>
      ) : steps.length === 0 ? (
        <p className="rounded-2xl bg-neutral-50 p-4 text-xs text-neutral-500 dark:bg-neutral-800">No eligible foundation topics are available in the current curriculum yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700 dark:bg-red-950/40 dark:text-red-300">{remediationCount} reinforcement steps</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{plan.topicInsights?.filter((topic) => topic.classification === 'STRONG').length ?? 0} strong topics</span>
          </div>
          <div className="space-y-2">
            {steps.map((step) => {
              const isPriority = step.type === 'PREREQUISITE_LESSON' || step.type === 'LESSON';
              const tone = actionTone[step.type] || 'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
              return (
                <div key={`${step.stepNumber}-${step.topicId}-${step.type}`} className="flex gap-3 rounded-2xl border border-neutral-100 p-3 dark:border-neutral-800">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${isPriority ? 'bg-orange-500 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>{step.stepNumber}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${tone}`}>{actionLabel[step.type] || step.type.replaceAll('_', ' ')}</span>
                      <span className="text-[10px] text-neutral-400">{step.subjectName} · {step.estimatedMinutes} min</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white">{step.topicName}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{step.reason}</p>
                    {step.type === 'PREREQUISITE_LESSON' && step.weakestPrerequisite && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-300"><AlertTriangle className="h-3 w-3" /> Prerequisite accuracy: {Math.round(step.weakestPrerequisite.accuracy)}%</p>
                    )}
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="inline-flex items-center gap-1 text-[10px] text-neutral-400"><Gauge className="h-3 w-3" /> {Math.round(step.accuracy * 100)}% accuracy</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="flex items-start gap-2 rounded-2xl bg-orange-50/70 p-3 text-[10px] leading-relaxed text-orange-800 dark:bg-orange-950/20 dark:text-orange-300"><RefreshCw className="mt-0.5 h-3 w-3 shrink-0" /> This route is recalculated from your latest learner evidence. Completing a step does not automatically mark a topic mastered; the engine checks practice and assessment evidence.</p>
        </>
      )}
    </section>
  );
};
