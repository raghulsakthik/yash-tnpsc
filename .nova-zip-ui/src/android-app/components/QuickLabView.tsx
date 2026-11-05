import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Clock,
  Sparkles,
  CheckCircle,
  RotateCcw,
  Zap,
  Play,
  XCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { novaApi } from '../../api/novaApi';

interface QuickLabViewProps {
  onAddXp: (amount: number) => void;
}

type QuickLabMode = { slug: string; name: string; desc: string; recommended: boolean };
type QuickLabQuestion = { token: string; prompt: string; revealPrompt?: string; hint?: string; options: string[]; memorize?: boolean };

const SPRINT_LENGTH = 5;
const SPRINT_SECONDS = 180;

// Quick Lab used to run entirely off two hardcoded 4-question banks
// (math/polity) baked straight into this component -- every learner saw
// the exact same 8 questions forever, and nothing was ever sent to the
// server. The real backend (/api/quick-lab/modes, /:mode/next, /submit)
// only ever had math-style generators (quicklab_mode table / quicklab.mjs)
// -- there is no "polity" mode server-side -- so this now loads the real,
// admin-configured mode list and generates a fresh question from the
// server every time, grading each answer through /submit.
export const QuickLabView: React.FC<QuickLabViewProps> = ({ onAddXp }) => {
  const [modes, setModes] = useState<QuickLabMode[]>([]);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [modesError, setModesError] = useState<string | null>(null);
  const [isLoadingModes, setIsLoadingModes] = useState(true);

  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SPRINT_SECONDS);

  const [question, setQuestion] = useState<QuickLabQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    novaApi
      .quickLabModes()
      .then((payload: any) => {
        if (cancelled) return;
        const list: QuickLabMode[] = payload?.modes || [];
        setModes(list);
        setSelectedMode((prev) => prev || list.find((m) => m.recommended)?.slug || list[0]?.slug || null);
      })
      .catch((err) => !cancelled && setModesError(err instanceof Error ? err.message : 'Unable to load Quick Lab modes.'))
      .finally(() => !cancelled && setIsLoadingModes(false));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isRunning || completed) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setIsRunning(false);
          setCompleted(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, completed]);

  const loadNextQuestion = async (mode: string) => {
    setIsLoadingQuestion(true);
    setError(null);
    try {
      const payload = await novaApi.quickLabNext(mode);
      setQuestion(payload as QuickLabQuestion);
      setSelectedOption(null);
      setCorrectIndex(null);
      setStartedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the next question.');
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const handleStart = async () => {
    if (!selectedMode) return;
    setIsRunning(true);
    setCompleted(false);
    setAnsweredCount(0);
    setScore(0);
    setTimeLeft(SPRINT_SECONDS);
    await loadNextQuestion(selectedMode);
  };

  const handleSelect = async (optIdx: number) => {
    if (!question || !selectedMode || selectedOption != null) return;
    setSelectedOption(optIdx);
    try {
      const result = await novaApi.quickLabSubmit({
        token: question.token,
        selectedIndex: optIdx,
        mode: selectedMode,
        timeTakenMs: Date.now() - startedAt,
      });
      setCorrectIndex(Number(result.correctIndex));
      if (result.correct) setScore((s) => s + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your answer.');
    }
  };

  const handleNext = async () => {
    const nextCount = answeredCount + 1;
    setAnsweredCount(nextCount);
    if (nextCount >= SPRINT_LENGTH || !selectedMode) {
      handleFinish();
      return;
    }
    await loadNextQuestion(selectedMode);
  };

  const handleFinish = () => {
    setIsRunning(false);
    setCompleted(true);
    onAddXp(200);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (isLoadingModes) {
    return (
      <div className="w-full max-w-4xl mx-auto rounded-3xl border border-stone-200/90 bg-white p-8 text-center shadow-xs dark:border-stone-800/90 dark:bg-stone-900">
        <p className="text-sm text-stone-500 dark:text-stone-400">Loading Quick Lab modes…</p>
      </div>
    );
  }

  if (modesError || modes.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-xs dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">{modesError || 'No Quick Lab modes are enabled right now.'}</p>
      </div>
    );
  }

  const activeMode = modes.find((m) => m.slug === selectedMode) || modes[0];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-in fade-in select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-500" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Quick Lab: Speed & Precision Drills
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Timed heuristic calculations generated fresh by the real adaptive engine
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-amber-100/80 px-3.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-500/20 shrink-0">
          <Zap className="h-3.5 w-3.5 text-amber-600" />
          <span>+200 XP Completion Bonus</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Drill Mode Selector */}
      {!isRunning && !completed && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {modes.map((m) => (
            <button
              key={m.slug}
              onClick={() => setSelectedMode(m.slug)}
              className={`rounded-xl border p-3 text-left text-xs transition-all cursor-pointer ${
                selectedMode === m.slug
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-500/30'
                  : 'border-stone-200 bg-white hover:border-amber-300 dark:border-stone-800 dark:bg-stone-900'
              }`}
            >
              <span className="font-bold text-stone-900 dark:text-stone-100">{m.name}</span>
              {m.recommended && (
                <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">Recommended</span>
              )}
              <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">{m.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Main Lab Card */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 space-y-5">
        {!isRunning && !completed ? (
          <div className="text-center py-8 space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                {activeMode?.name || 'Quick Lab'}
              </h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                {activeMode?.desc}
              </p>
            </div>
            <button
              onClick={handleStart}
              disabled={!selectedMode}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 active:scale-95 transition-all cursor-pointer mx-auto disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              <span>Initiate 3-Minute Speed Sprint</span>
            </button>
          </div>
        ) : isRunning ? (
          <div className="space-y-5">
            {/* Timer Strip */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Item {answeredCount + 1} of {SPRINT_LENGTH}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-stone-900 dark:text-stone-100 bg-stone-100 px-2.5 py-1 rounded-lg dark:bg-stone-800">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            </div>

            {isLoadingQuestion || !question ? (
              <p className="text-center text-xs text-stone-500 dark:text-stone-400 py-8">Loading…</p>
            ) : (
              <>
                {/* Question */}
                <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/60">
                  <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                    {question.prompt}
                  </h4>
                  {question.hint && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">💡 Shortcut: {question.hint}</p>
                  )}
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {question.options.map((opt, i) => {
                    const isSelected = selectedOption === i;
                    const isCorrect = correctIndex === i;
                    let cls = 'border-stone-200 bg-white hover:border-amber-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200';
                    if (selectedOption != null) {
                      if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
                      else if (isSelected) cls = 'border-red-500 bg-red-50 dark:bg-red-950/40';
                      else cls = 'opacity-40 border-stone-200 dark:border-stone-800';
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelect(i)}
                        disabled={selectedOption != null}
                        className={`flex items-center gap-2.5 rounded-2xl border p-3 text-xs font-medium text-left transition-all cursor-pointer active:scale-98 ${cls}`}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt}</span>
                        {selectedOption != null && isCorrect && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 ml-auto" />}
                        {selectedOption != null && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-600 shrink-0 ml-auto" />}
                      </button>
                    );
                  })}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-end border-t border-stone-100 pt-4 dark:border-stone-800">
                  {selectedOption != null && (
                    answeredCount + 1 === SPRINT_LENGTH ? (
                      <button
                        onClick={handleFinish}
                        className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 cursor-pointer"
                      >
                        Complete Lab & Submit
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 active:scale-95 cursor-pointer"
                      >
                        Next Item →
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Finished State */
          <div className="text-center py-6 space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                Speed Drill Completed!
              </h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Score: <strong className="font-mono text-emerald-600">{score} / {SPRINT_LENGTH}</strong> · You earned +200 XP
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleStart}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-300 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Repeat Drill</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
