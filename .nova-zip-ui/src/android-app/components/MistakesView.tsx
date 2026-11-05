import React, { useState } from 'react';
import { AlertTriangle, Clock, Brain, CheckCircle, RefreshCw, Sparkles, ArrowRight, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MistakeItem } from '../../types';
import { novaApi, mapPracticeQuestion } from '../../api/novaApi';

interface MistakesViewProps {
  mistakes: MistakeItem[];
  onAddXp: (amount: number) => void;
}

type RetryQuestion = NonNullable<ReturnType<typeof mapPracticeQuestion>>;

export const MistakesView: React.FC<MistakesViewProps> = ({ mistakes, onAddXp }) => {
  const [items, setItems] = useState<MistakeItem[]>(mistakes);
  const [selectedType, setSelectedType] = useState<string>('all');
  // "Practice & Clear" used to mark a mistake resolved with no actual
  // re-attempt -- a pure local toggle with no backend call at all, so the
  // mistake would simply reappear (unresolved) on the next real load from
  // /api/mistakes/next. It now re-fetches the same mistake as a live
  // question and only clears it once the learner answers it correctly
  // through the real /api/attempts endpoint.
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryQuestion, setRetryQuestion] = useState<RetryQuestion | null>(null);
  const [retrySelected, setRetrySelected] = useState<number | null>(null);
  const [retryCorrectIndex, setRetryCorrectIndex] = useState<number | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [isSubmittingRetry, setIsSubmittingRetry] = useState(false);

  const countByType = {
    CONCEPT_GAP: items.filter((m) => m.mistakeType === 'CONCEPT_GAP').length * 4,
    CARELESS_ERROR: items.filter((m) => m.mistakeType === 'CARELESS_ERROR').length * 4,
    TIME_PRESSURE: items.filter((m) => m.mistakeType === 'TIME_PRESSURE').length * 5,
  };

  const handleStartRetry = async (id: string) => {
    setRetryingId(id);
    setRetryQuestion(null);
    setRetrySelected(null);
    setRetryCorrectIndex(null);
    setRetryError(null);
    try {
      const payload = await novaApi.mistake();
      const mapped = mapPracticeQuestion(payload);
      if (mapped) {
        setRetryQuestion(mapped);
      } else {
        setRetryError('No live question is available for this mistake right now.');
      }
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Unable to load this mistake as a question.');
    }
  };

  const handleRetrySelect = async (idx: number) => {
    if (!retryQuestion || retrySelected != null || isSubmittingRetry) return;
    setRetrySelected(idx);
    setIsSubmittingRetry(true);
    try {
      const result = await novaApi.attempt({
        attemptId: crypto.randomUUID(),
        questionId: retryQuestion.id,
        selectedIndex: idx,
        timeTakenMs: 0,
        mode: 'PRACTICE',
      });
      setRetryCorrectIndex(Number(result.correctIndex));
      if (result.correct && retryingId) {
        setItems((prev) => prev.map((m) => (m.id === retryingId ? { ...m, resolved: true } : m)));
        onAddXp(75);
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Unable to submit your answer.');
    } finally {
      setIsSubmittingRetry(false);
    }
  };

  const handleCloseRetry = () => {
    setRetryingId(null);
    setRetryQuestion(null);
    setRetrySelected(null);
    setRetryCorrectIndex(null);
    setRetryError(null);
  };

  const filtered = items.filter((m) => {
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
            className={`flex flex-col justify-between gap-4 rounded-3xl border p-5 transition-all sm:flex-row sm:items-center ${
              item.resolved
                ? 'border-emerald-200 bg-emerald-50/30 opacity-70 dark:border-emerald-950 dark:bg-emerald-950/20'
                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800'
            }`}
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
              {item.resolved ? (
                <span className="flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>Remediated</span>
                </span>
              ) : (
                <button
                  onClick={() => handleStartRetry(item.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-600 active:scale-95"
                >
                  <span>Practice & Clear</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {retryingId === item.id && (
              <div className="w-full basis-full rounded-2xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900 dark:bg-orange-950/20">
                {retryError && (
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">{retryError}</p>
                )}
                {!retryError && !retryQuestion && (
                  <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Loading question…</p>
                )}
                {retryQuestion && (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">{retryQuestion.question}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {retryQuestion.options.map((opt: string, idx: number) => {
                        const isSelected = retrySelected === idx;
                        const isCorrect = retryCorrectIndex === idx;
                        let cls = 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900';
                        if (retrySelected != null) {
                          if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
                          else if (isSelected) cls = 'border-red-500 bg-red-50 dark:bg-red-950/40';
                          else cls = 'opacity-40 border-neutral-200 dark:border-neutral-800';
                        }
                        return (
                          <button
                            key={idx}
                            onClick={() => handleRetrySelect(idx)}
                            disabled={retrySelected != null}
                            className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs font-medium ${cls}`}
                          >
                            <span>{opt}</span>
                            {retrySelected != null && isCorrect && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />}
                            {retrySelected != null && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {retrySelected != null && (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{retryQuestion.explanation}</p>
                        <button
                          onClick={handleCloseRetry}
                          className="shrink-0 rounded-lg bg-neutral-800 px-3 py-1.5 text-[10px] font-bold text-white dark:bg-neutral-700"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
