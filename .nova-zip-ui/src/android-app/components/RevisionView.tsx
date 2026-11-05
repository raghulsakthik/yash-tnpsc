import React, { useEffect, useState } from 'react';
import { Brain, CheckCircle, XCircle, ArrowRight, Sparkles, CalendarCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PracticeQuestion } from '../../types';
import { novaApi, mapPracticeQuestion } from '../../api/novaApi';

interface RevisionViewProps {
  onAddXp: (amount: number) => void;
}

type LoadState = 'LOADING' | 'READY' | 'NOTHING_DUE' | 'ERROR';

/**
 * "Memory Echo" -- spaced-repetition revision, newly built for Android
 * (it never existed here before; /api/revision/next was unreferenced
 * anywhere in android-app/, see the Phase 13 parity doc). Mirrors the web
 * revision page: nextQuestionUrl=/api/revision/next, submitUrl=/api/attempts
 * with mode='REVISION'. Unlike Practice there's no fixed session length --
 * the schedule decides how many topics are due, and the view naturally
 * ends with a 404 NOTHING_DUE once they're exhausted, not a count the
 * client invents.
 */
export const RevisionView: React.FC<RevisionViewProps> = ({ onAddXp }) => {
  const [state, setState] = useState<LoadState>('LOADING');
  const [currentQ, setCurrentQ] = useState<PracticeQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [serverCorrectIndex, setServerCorrectIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const loadNext = () => {
    setIsLoadingNext(true);
    setError(null);
    novaApi
      .revisionNext()
      .then((payload) => {
        const mapped = mapPracticeQuestion(payload);
        if (mapped) {
          setCurrentQ(mapped);
          setState('READY');
          setSelectedOption(null);
          setIsAnswered(false);
          setServerCorrectIndex(null);
          setExplanation('');
          setStartedAt(Date.now());
        } else {
          setState('NOTHING_DUE');
        }
      })
      .catch((err) => {
        const code = (err as { code?: string })?.code;
        if (code === 'NOTHING_DUE') {
          setState('NOTHING_DUE');
        } else {
          setState('ERROR');
          setError(err instanceof Error ? err.message : 'Unable to load your revision queue.');
        }
      })
      .finally(() => setIsLoadingNext(false));
  };

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = async (idx: number) => {
    if (isAnswered || isSubmitting || !currentQ) return;
    setSelectedOption(idx);
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await novaApi.attempt({
        attemptId: crypto.randomUUID(),
        questionId: currentQ.id,
        selectedIndex: idx,
        timeTakenMs: Date.now() - startedAt,
        mode: 'REVISION',
      });
      setServerCorrectIndex(Number(result.correctIndex));
      setExplanation(result.explanation || currentQ.explanation || '');
      setIsAnswered(true);
      if (result.correct) {
        onAddXp(40);
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your answer right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setReviewedCount((n) => n + 1);
    loadNext();
  };

  if (state === 'LOADING') {
    return (
      <div className="w-full max-w-3xl mx-auto rounded-3xl border border-stone-200/90 bg-white p-8 text-center shadow-xs dark:border-stone-800/90 dark:bg-stone-900">
        <p className="text-sm text-stone-500 dark:text-stone-400">Checking your revision schedule…</p>
      </div>
    );
  }

  if (state === 'ERROR') {
    return (
      <div className="w-full max-w-3xl mx-auto rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-xs dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (state === 'NOTHING_DUE') {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-500" />
          <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Memory Echo</h2>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
            <CalendarCheck className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-neutral-900 dark:text-white">All caught up</h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Nothing is due for review right now — come back tomorrow.
          </p>
          {reviewedCount > 0 && (
            <p className="mt-3 text-xs font-semibold text-violet-700 dark:text-violet-300">Reviewed {reviewedCount} question{reviewedCount === 1 ? '' : 's'} this session.</p>
          )}
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 select-none animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-500" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Memory Echo</h2>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Whatever is due comes up first — nothing until its schedule says so.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-violet-100/80 px-3.5 py-1 text-xs font-bold text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 ring-1 ring-violet-500/20 shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-violet-600" />
          <span>+40 XP per correct review</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-xs dark:border-stone-800/90 dark:bg-stone-900">
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-5">
          <span className="font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider text-[10px]">{currentQ.topic}</span>
          <span className="font-mono font-bold text-stone-800 dark:text-stone-200">Reviewed: {reviewedCount}</span>
        </div>

        <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">
          {currentQ.question}
        </h3>

        <div className="mt-6 space-y-3">
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = serverCorrectIndex === idx;
            let btnClass =
              'border-neutral-200 hover:border-violet-300 hover:bg-violet-50/30 text-neutral-800 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-600';
            if (isAnswered) {
              if (isCorrect) btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200';
              else if (isSelected && !isCorrect) btnClass = 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200';
              else btnClass = 'opacity-40 border-neutral-200 dark:border-neutral-800';
            }
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={isAnswered || isSubmitting}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left text-xs sm:text-sm font-medium transition-all ${btnClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </div>
                {isAnswered && isCorrect && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="mt-6 rounded-2xl bg-neutral-50 p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-800/60">
            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Explanation:</p>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{explanation}</p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleNext}
                disabled={isLoadingNext}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-violet-700 active:scale-98 disabled:opacity-60"
              >
                <span>{isLoadingNext ? 'Loading…' : 'Next Review'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
