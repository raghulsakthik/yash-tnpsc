import React, { useState } from 'react';
import { PenTool, CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PracticeQuestion } from '../../types';

interface PracticeViewProps {
  questions: PracticeQuestion[];
  onAddXp: (amount: number) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  questions,
  onAddXp,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === currentQ.correctIndex) {
      setScore((s) => s + 1);
      onAddXp(50);
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 },
      });
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
      });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 select-none animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-amber-500" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Practice & Adaptive MCQs
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Reinforce high-yield syllabus concepts, mental math shortcuts, and Indian Polity frameworks
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-amber-100/80 px-3.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-500/20 shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span>+50 XP per correct answer</span>
        </div>
      </div>

      {!isFinished ? (
        <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-xs dark:border-stone-800/90 dark:bg-stone-900">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
            <span className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[10px]">
              Question {currentIndex + 1} of {questions.length} · {currentQ.topic}
            </span>
            <span className="font-mono font-bold text-stone-800 dark:text-stone-200">Score: {score}</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800 mb-5">
            <div
              className="h-full rounded-full bg-linear-to-r from-orange-500 to-amber-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Text */}
          <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">
            {currentQ.question}
          </h3>

          {/* Options */}
          <div className="mt-6 space-y-3">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctIndex;

              let btnClass =
                'border-neutral-200 hover:border-orange-300 hover:bg-orange-50/30 text-neutral-800 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-600';

              if (isAnswered) {
                if (isCorrect) {
                  btnClass =
                    'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200';
                } else if (isSelected && !isCorrect) {
                  btnClass =
                    'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200';
                } else {
                  btnClass = 'opacity-40 border-neutral-200 dark:border-neutral-800';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={isAnswered}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left text-xs sm:text-sm font-medium transition-all ${btnClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </div>

                  {isAnswered && isCorrect && (
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation & Next Button */}
          {isAnswered && (
            <div className="mt-6 rounded-2xl bg-neutral-50 p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-800/60">
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Explanation:
              </p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                {currentQ.explanation}
              </p>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 active:scale-98"
                >
                  <span>{currentIndex + 1 === questions.length ? 'See Results' : 'Next Question'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Results View */
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-xs dark:border-neutral-800 dark:bg-neutral-800">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
            <Trophy className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-neutral-900 dark:text-white">
            Practise Session Finished!
          </h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            You scored {score} out of {questions.length} questions correctly.
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>+{score * 50} XP Awarded!</span>
          </div>

          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-600"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Practice</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
