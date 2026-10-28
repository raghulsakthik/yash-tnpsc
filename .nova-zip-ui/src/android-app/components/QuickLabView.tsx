import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Clock,
  Sparkles,
  CheckCircle,
  RotateCcw,
  Award,
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickLabViewProps {
  onAddXp: (amount: number) => void;
}

export const QuickLabView: React.FC<QuickLabViewProps> = ({ onAddXp }) => {
  const [selectedLab, setSelectedLab] = useState<'math' | 'polity'>('math');
  const [isRunning, setIsRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(180);
  const [completed, setCompleted] = useState(false);

  // Rapid mental math sprint items
  const mathDrill = [
    { q: 'What is 16.66% of 540?', options: ['90', '85', '95', '100'], correct: 0, hint: '16.66% = 1/6th' },
    { q: 'What is 12.5% of 6400?', options: ['700', '800', '850', '900'], correct: 1, hint: '12.5% = 1/8th' },
    { q: 'Convert 1/14 into approximate percentage:', options: ['6.66%', '7.14%', '7.69%', '8.33%'], correct: 1, hint: '100 / 14 = 7.14%' },
    { q: 'If price increases by 25%, consumption must decrease by what % to keep expenditure constant?', options: ['20%', '25%', '16.66%', '30%'], correct: 0, hint: 'x/(100+x) = 25/125 = 1/5 = 20%' },
  ];

  // Constitutional landmark recall items
  const polityDrill = [
    { q: 'Which Article deals with Right to Constitutional Remedies (the "Heart and Soul")?', options: ['Article 19', 'Article 21', 'Article 32', 'Article 226'], correct: 2, hint: 'Dr. B.R. Ambedkar quotation' },
    { q: 'Which Article empowers High Courts to issue Writs for Fundamental AND legal rights?', options: ['Article 32', 'Article 143', 'Article 226', 'Article 356'], correct: 2, hint: 'High Court jurisdiction' },
    { q: 'Which Schedule contains the 22 officially recognized languages of India?', options: ['7th Schedule', '8th Schedule', '9th Schedule', '10th Schedule'], correct: 1, hint: 'Eighth Schedule' },
    { q: 'Which Constitutional Amendment added Fundamental Duties (Part IV-A)?', options: ['42nd Amendment (1976)', '44th Amendment (1978)', '86th Amendment (2002)', '73rd Amendment (1992)'], correct: 0, hint: 'Swaran Singh Committee' },
  ];

  const currentQuestions = selectedLab === 'math' ? mathDrill : polityDrill;

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

  const handleStart = () => {
    setIsRunning(true);
    setCompleted(false);
    setCurrentIdx(0);
    setAnswers({});
    setTimeLeft(selectedLab === 'math' ? 180 : 120);
  };

  const handleSelect = (optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }));
  };

  const handleFinish = () => {
    setIsRunning(false);
    setCompleted(true);
    onAddXp(200);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const score = currentQuestions.reduce(
    (acc, q, i) => (answers[i] === q.correct ? acc + 1 : acc),
    0
  );

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

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
            Timed heuristic calculations and high-speed landmark recall drills
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-amber-100/80 px-3.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-500/20 shrink-0">
          <Zap className="h-3.5 w-3.5 text-amber-600" />
          <span>+200 XP Completion Bonus</span>
        </div>
      </div>

      {/* Drill Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-stone-200/80 bg-stone-100/80 p-1 dark:border-stone-800 dark:bg-stone-800 text-xs font-semibold shadow-inner">
        <button
          onClick={() => {
            setSelectedLab('math');
            setIsRunning(false);
            setCompleted(false);
          }}
          className={`rounded-xl py-2 transition-all cursor-pointer ${
            selectedLab === 'math'
              ? 'bg-white font-bold text-stone-900 shadow-2xs dark:bg-stone-900 dark:text-amber-400 ring-1 ring-amber-500/20'
              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
          }`}
        >
          ⚡ Mental Math Sprint (Percentages)
        </button>
        <button
          onClick={() => {
            setSelectedLab('polity');
            setIsRunning(false);
            setCompleted(false);
          }}
          className={`rounded-xl py-2 transition-all cursor-pointer ${
            selectedLab === 'polity'
              ? 'bg-white font-bold text-stone-900 shadow-2xs dark:bg-stone-900 dark:text-amber-400 ring-1 ring-amber-500/20'
              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
          }`}
        >
          🏛️ Constitutional Articles Speed Recall
        </button>
      </div>

      {/* Main Lab Card */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-xs dark:border-stone-800/90 dark:bg-stone-900 space-y-5">
        {!isRunning && !completed ? (
          <div className="text-center py-8 space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                {selectedLab === 'math'
                  ? '5-Minute Mental Math Sprint'
                  : 'Constitutional Articles Speed Recall'}
              </h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                {selectedLab === 'math'
                  ? 'Calculate fractional equivalents and percentage shifts instantly without scratch paper.'
                  : 'Recall landmark constitutional articles, amendments, and schedules under high-pressure exam timing.'}
              </p>
            </div>
            <button
              onClick={handleStart}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 active:scale-95 transition-all cursor-pointer mx-auto"
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
                Item {currentIdx + 1} of {currentQuestions.length}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-stone-900 dark:text-stone-100 bg-stone-100 px-2.5 py-1 rounded-lg dark:bg-stone-800">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            </div>

            {/* Question */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/60">
              <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                {currentQuestions[currentIdx].q}
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                💡 Shortcut: {currentQuestions[currentIdx].hint}
              </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentQuestions[currentIdx].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 text-xs font-medium text-left transition-all cursor-pointer active:scale-98 ${
                    answers[currentIdx] === i
                      ? 'border-amber-500 bg-amber-50/80 text-amber-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200 ring-1 ring-amber-500/40'
                      : 'border-stone-200 bg-white hover:border-amber-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200'
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between border-t border-stone-100 pt-4 dark:border-stone-800">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="text-xs font-semibold text-stone-500 disabled:opacity-30 cursor-pointer"
              >
                Previous
              </button>
              {currentIdx + 1 === currentQuestions.length ? (
                <button
                  onClick={handleFinish}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 cursor-pointer"
                >
                  Complete Lab & Submit
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 active:scale-95 cursor-pointer"
                >
                  Next Item →
                </button>
              )}
            </div>
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
                Score: <strong className="font-mono text-emerald-600">{score} / {currentQuestions.length}</strong> · You earned +200 XP
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
