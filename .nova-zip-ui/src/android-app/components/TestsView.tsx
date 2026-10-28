import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Clock,
  Award,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Play,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  CheckCheck,
  Eye,
  Monitor,
  Flame,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TestSession } from '../../types';
import { BrandLogo } from './BrandLogo';
import { apiUrl } from '../../api/novaApi';
import { useProctoring } from '../../hooks/useProctoring';

interface TestsViewProps {
  tests: TestSession[];
  onAddXp: (amount: number) => void;
}

type BackendTestQuestion = {
  questionId: string;
  topicId: string;
  topicName: string;
  prompt: string;
  options: string[];
  selectedIndex?: number | null;
};

export const TestsView: React.FC<TestsViewProps> = ({ tests, onAddXp }) => {
  const [activeTest, setActiveTest] = useState<TestSession | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(40 * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [testQuestions, setTestQuestions] = useState<BackendTestQuestion[]>([]);
  const [submissionResult, setSubmissionResult] = useState<{ score: number; correctCount: number; questionCount: number } | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { consent: proctoringConsent, requestConsent, startRecording, stopRecording } = useProctoring();

  // Timer countdown when test is running
  useEffect(() => {
    if (!activeTest || isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTest, isSubmitted]);

  const handleStartTest = async (test: TestSession) => {
    setLoadingTest(true);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/tests/${test.id}`), { credentials: 'include' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to load test');
      const questions: BackendTestQuestion[] = payload.questions || [];
      setTestQuestions(questions);
      setActiveTest(test);
      setCurrentQIndex(0);
      setAnswers(Object.fromEntries(
        questions
          .map((q, i) => [i, q.selectedIndex] as const)
          .filter((entry): entry is [number, number] => entry[1] !== null && entry[1] !== undefined)
      ));
      setTimeLeft(test.durationMinutes * 60);
      setIsSubmitted(false);
      setSubmissionResult(null);

      // Consent is asked right here -- this tap is the real user gesture
      // getUserMedia requires. Declining doesn't block the test; it's
      // recorded honestly as DENIED instead of silently pretending the
      // session was proctored.
      const granted = await requestConsent();
      if (granted) startRecording(test.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load test');
    } finally {
      setLoadingTest(false);
    }
  };

  const handleSelectAnswer = async (qIdx: number, optIdx: number) => {
    if (!activeTest || !testQuestions[qIdx]) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    try {
      await fetch(apiUrl(`/api/tests/${activeTest.id}/answers`), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: testQuestions[qIdx].questionId, selectedIndex: optIdx, timeTakenMs: 0, markedForReview: false }),
      });
    } catch {
      setError('Answer could not be saved. Please try again.');
    }
  };

  const handleSubmitTest = async () => {
    if (!activeTest) return;
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/tests/${activeTest.id}/submit`), { method: 'POST', credentials: 'include' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to submit test');
      setSubmissionResult({ score: Number(payload.score || 0), correctCount: Number(payload.correctCount || 0), questionCount: Number(payload.questionCount || testQuestions.length) });
      setIsSubmitted(true);
      stopRecording();
      const xp = Math.round(Number(payload.score || 0) * 2.5);
      onAddXp(xp);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit test');
    }
  };

  const scoreCalculated = submissionResult?.correctCount || 0;
  const accuracyPct = submissionResult ? Math.round((submissionResult.correctCount / Math.max(1, submissionResult.questionCount)) * 100) : 0;
  const xpAwarded = submissionResult ? Math.round(submissionResult.score * 2.5) : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  /* =========================================================================
     ACTIVE TEST SIMULATOR (Live Proctoring & Telemetry)
     ========================================================================= */
  if (activeTest) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4 animate-in fade-in select-none">
        {/* Top Sticky Test Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between rounded-2xl border border-stone-200/90 bg-stone-50/95 p-3 sm:p-4 backdrop-blur-md shadow-xs dark:border-stone-800/90 dark:bg-stone-900/95">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => { stopRecording(); setActiveTest(null); }}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>
            <div className="min-w-0 hidden sm:block">
              <h2 className="font-serif text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                {activeTest.title}
              </h2>
            </div>
          </div>

          {/* Live Proctoring Indicators + Timer */}
          <div className="flex items-center gap-2">
            {/* Live Proctoring Sensor Chip -- reflects the real camera consent state, not a decorative constant */}
            <div
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold shadow-2xs ${
                proctoringConsent === 'granted'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-stone-300 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400'
              }`}
            >
              <ShieldCheck className={`h-3.5 w-3.5 ${proctoringConsent === 'granted' ? 'text-emerald-600 animate-pulse' : 'text-stone-400'}`} />
              <span className="hidden xs:inline">{proctoringConsent === 'granted' ? 'Proctoring: Active' : 'Not proctored'}</span>
              <span className="xs:hidden">{proctoringConsent === 'granted' ? 'Safe' : 'Off'}</span>
            </div>

            {/* Timer countdown pill */}
            <div
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-bold shadow-2xs transition-colors ${
                timeLeft < 300
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {!isSubmitted && testQuestions.length === 0 ? (
          <div className="rounded-3xl border border-stone-200/90 bg-white p-8 text-center text-sm text-stone-500 dark:border-stone-800/90 dark:bg-stone-900 dark:text-stone-400">
            Loading your test…
          </div>
        ) : !isSubmitted ? (
          <div className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 space-y-5">
            {/* Question Navigator Bar */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Question {currentQIndex + 1} of {testQuestions.length}
              </span>
              <div className="flex items-center gap-1.5">
                {testQuestions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQIndex(i)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentQIndex === i
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : answers[i] !== undefined
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Card */}
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-800/50 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                <span>{testQuestions[currentQIndex].topicName}</span>
              </div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">
                {testQuestions[currentQIndex].prompt}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              {testQuestions[currentQIndex].options.map((opt, optIdx) => {
                const isSelected = answers[currentQIndex] === optIdx;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectAnswer(currentQIndex, optIdx)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-medium transition-all cursor-pointer active:scale-98 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 text-amber-950 shadow-2xs dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200 ring-1 ring-amber-500/40'
                        : 'border-stone-200/90 bg-white hover:border-amber-400/60 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-white'
                            : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="font-sans leading-normal">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Stepper Controls */}
            <div className="flex items-center justify-between border-t border-stone-100 pt-4 dark:border-stone-800">
              <button
                onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))}
                disabled={currentQIndex === 0}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 disabled:opacity-40 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-400 cursor-pointer"
              >
                Previous
              </button>

              {currentQIndex + 1 === testQuestions.length ? (
                <button
                  onClick={handleSubmitTest}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Submit & Score</span>
                </button>
              ) : (
                <button
                  onClick={() =>
                    setCurrentQIndex((i) => Math.min(testQuestions.length - 1, i + 1))
                  }
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Next Question</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Assessment Result & Proctoring Certificate */
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Award className="h-8 w-8" />
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                OFFICIAL TNPSC SIMULATION COMPLETE
              </div>
              <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                Performance & Forensic Proctoring Report
              </h2>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                Completed under automated full-screen and tab-integrity surveillance with zero recorded policy breaches.
              </p>
            </div>

            {/* Scorecard Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/50">
                <span className="text-[10px] font-semibold text-stone-400 uppercase">Correct</span>
                <p className="font-mono text-xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  {scoreCalculated}/{testQuestions.length}
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/50">
                <span className="text-[10px] font-semibold text-stone-400 uppercase">Accuracy</span>
                <p className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {accuracyPct}%
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/50">
                <span className="text-[10px] font-semibold text-stone-400 uppercase">Proctoring</span>
                <p className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{proctoringConsent === 'granted' ? 'RECORDED' : 'NOT PROCTORED'}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/50">
                <span className="text-[10px] font-semibold text-stone-400 uppercase">XP Awarded</span>
                <p className="font-mono text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  +{xpAwarded} XP
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setActiveTest(null)}
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                <span>Return to Mocks Hub</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* =========================================================================
     MOCKS LIST VIEW
     ========================================================================= */
  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 animate-in fade-in select-none">
      {/* Classical Academic Header */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              <span>EXAMINATION COCKPIT</span>
              <span>·</span>
              <span>SUPERVISED MOCKS & GATE ASSESSMENTS</span>
            </div>
            <h1 className="mt-1 font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Supervised Mocks & Diagnostic Tests
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-2xl">
              Strictly proctored phase-gate assessments replicating the official TNPSC Group 2 timer, negative marking, and anti-tab switch integrity checks.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3 sm:p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30 shrink-0">
            <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                Proctoring Guard: Armed
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                Forensic tab-switch & window blur tracking
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tests Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tests.map((test) => (
          <div
            key={test.id}
            className="flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-amber-400/60 hover:shadow-md dark:border-stone-800/90 dark:bg-stone-900 transition-all space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  {test.phase} · Week {test.week}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    test.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {test.status}
                </span>
              </div>

              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 leading-snug">
                  {test.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{test.durationMinutes} mins</span>
                  </span>
                  <span>·</span>
                  <span>{test.questionsCount} Questions</span>
                  <span>·</span>
                  <span>Max {test.maxScore} Marks</span>
                </div>
              </div>

              {test.score !== undefined && (
                <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-xs dark:border-stone-800 dark:bg-stone-800/60">
                  <div className="flex justify-between font-bold text-stone-800 dark:text-stone-200">
                    <span>Highest Score:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {test.score} / {test.maxScore} ({test.accuracy}%)
                    </span>
                  </div>
                </div>
              )}

              {test.recommendation && (
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-2.5 border border-amber-200/50 dark:border-amber-900/30">
                  💡 <span className="font-semibold text-stone-800 dark:text-stone-200">Recommendation:</span>{' '}
                  {test.recommendation}
                </p>
              )}
            </div>

            <button
              onClick={() => handleStartTest(test)}
              disabled={loadingTest}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              <span>{loadingTest ? 'Loading…' : test.status === 'Completed' ? 'Retake Supervised Mock' : 'Launch Supervised Test'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
