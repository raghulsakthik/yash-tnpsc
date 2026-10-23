import React, { useState, useEffect } from 'react';
import { FileCheck, Clock, Award, CheckCircle, XCircle, ArrowRight, Play, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TestSession } from '../types';

interface TestsViewProps {
  tests: TestSession[];
  onAddXp: (amount: number) => void;
}

export const TestsView: React.FC<TestsViewProps> = ({ tests, onAddXp }) => {
  const [activeTest, setActiveTest] = useState<TestSession | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(40 * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Sample mock questions for the test session
  const testQuestions = [
    {
      q: 'Which Article of the Indian Constitution provides for the amendment of the Constitution?',
      options: ['Article 352', 'Article 356', 'Article 360', 'Article 368'],
      correct: 3,
      topic: 'Indian Polity',
    },
    {
      q: 'The HCF of two numbers is 11 and their LCM is 7700. If one of the numbers is 275, find the other number.',
      options: ['279', '283', '308', '318'],
      correct: 2,
      topic: 'Aptitude & Numbers',
    },
    {
      q: 'Which Chola king constructed the famous Brihadisvara Temple in Thanjavur?',
      options: ['Rajaraja Chola I', 'Rajendra Chola I', 'Karikala Chola', 'Sundara Chola'],
      correct: 0,
      topic: 'History of Tamil Nadu',
    },
  ];

  // Timer countdown when test is running
  useEffect(() => {
    if (!activeTest || isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTest, isSubmitted]);

  const handleStartTest = (test: TestSession) => {
    setActiveTest(test);
    setCurrentQIndex(0);
    setAnswers({});
    setTimeLeft(test.durationMinutes * 60);
    setIsSubmitted(false);
  };

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitTest = () => {
    setIsSubmitted(true);
    onAddXp(250);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const scoreCalculated = testQuestions.reduce((acc, q, idx) => {
    return answers[idx] === q.correct ? acc + 1 : acc;
  }, 0);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
              Examinations & Milestone Tests
            </h2>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Phase gate assessments and timed diagnostic mock tests
          </p>
        </div>
      </div>

      {/* Tests Cards List */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tests.map((test) => (
          <div
            key={test.id}
            className="flex flex-col justify-between rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                  {test.phase} • Week {test.week}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    test.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  {test.status}
                </span>
              </div>

              <h3 className="mt-3 text-base font-bold text-neutral-900 dark:text-white">
                {test.title}
              </h3>

              <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {test.durationMinutes} mins
                </span>
                <span>•</span>
                <span>{test.questionsCount} Questions</span>
                <span>•</span>
                <span>Max: {test.maxScore} Marks</span>
              </div>

              {test.score !== undefined && (
                <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs dark:bg-neutral-700/50">
                  <div className="flex justify-between font-bold text-neutral-800 dark:text-neutral-200">
                    <span>Previous Score:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {test.score} / {test.maxScore} ({test.accuracy}%)
                    </span>
                  </div>
                </div>
              )}

              {test.recommendation && (
                <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  💡 <strong>YASH Recommendation:</strong> {test.recommendation}
                </p>
              )}
            </div>

            <button
              onClick={() => handleStartTest(test)}
              className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-orange-600 active:scale-98"
            >
              <Play className="h-4 w-4" />
              <span>{test.status === 'Completed' ? 'Retake Test' : 'Begin Assessment'}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Interactive Test Simulator Modal */}
      {activeTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs"
            onClick={() => setActiveTest(null)}
          />

          <div className="relative z-10 flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 border-neutral-200 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {activeTest.title}
                </h3>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  TNPSC Group 2 Simulation
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 rounded-xl bg-orange-100 px-3 py-1 font-mono text-xs font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
                <button
                  onClick={() => setActiveTest(null)}
                  className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Test Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {!isSubmitted ? (
                <div className="space-y-6">
                  {/* Question Navigator */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                      Question {currentQIndex + 1} of {testQuestions.length}
                    </span>
                    <div className="flex gap-1.5">
                      {testQuestions.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentQIndex(i)}
                          className={`h-7 w-7 rounded-lg text-xs font-bold transition-all ${
                            currentQIndex === i
                              ? 'bg-orange-500 text-white shadow-xs'
                              : answers[i] !== undefined
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-800/60">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">
                      Topic: {testQuestions[currentQIndex].topic}
                    </span>
                    <h4 className="mt-1 text-base font-bold text-neutral-900 dark:text-white">
                      {testQuestions[currentQIndex].q}
                    </h4>
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {testQuestions[currentQIndex].options.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectAnswer(currentQIndex, optIdx)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-xs font-medium transition-all ${
                          answers[currentQIndex] === optIdx
                            ? 'border-orange-500 bg-orange-50/60 text-orange-950 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-200'
                            : 'border-neutral-200 hover:border-orange-300 dark:border-neutral-700 dark:text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Bottom Navigation */}
                  <div className="flex items-center justify-between border-t pt-4 border-neutral-200 dark:border-neutral-800">
                    <button
                      onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))}
                      disabled={currentQIndex === 0}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-600 disabled:opacity-30 dark:text-neutral-400"
                    >
                      Previous
                    </button>

                    {currentQIndex + 1 === testQuestions.length ? (
                      <button
                        onClick={handleSubmitTest}
                        className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                      >
                        Submit Test
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentQIndex((i) => Math.min(testQuestions.length - 1, i + 1))}
                        className="rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-white hover:bg-orange-600"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Post-Test Analysis Report (Section 37) */
                <div className="space-y-6 text-center py-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                    <Award className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-neutral-900 dark:text-white">
                      Assessment Completed!
                    </h4>
                    <p className="mt-1 text-xs text-neutral-500">
                      Your test score and weak-topic analysis have been processed by YASH
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-neutral-50 p-4 border dark:bg-neutral-800 dark:border-neutral-700">
                      <span className="text-[10px] text-neutral-400 font-bold">SCORE</span>
                      <div className="text-xl font-bold text-neutral-900 dark:text-white mt-1">
                        {scoreCalculated} / {testQuestions.length}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-4 border dark:bg-neutral-800 dark:border-neutral-700">
                      <span className="text-[10px] text-neutral-400 font-bold">ACCURACY</span>
                      <div className="text-xl font-bold text-emerald-600 mt-1">
                        {Math.round((scoreCalculated / testQuestions.length) * 100)}%
                      </div>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-4 border dark:bg-neutral-800 dark:border-neutral-700">
                      <span className="text-[10px] text-neutral-400 font-bold">XP REWARD</span>
                      <div className="text-xl font-bold text-orange-600 mt-1">
                        +250 XP
                      </div>
                    </div>
                  </div>

                  {/* Adaptive Remediation Plan */}
                  <div className="rounded-2xl bg-orange-50/70 p-4 border border-orange-200 text-left dark:bg-orange-950/30 dark:border-orange-900/40">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-orange-600" />
                      <span className="text-xs font-bold text-orange-900 dark:text-orange-300">
                        YASH Adaptive Remediation Recommendation
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {scoreCalculated === testQuestions.length
                        ? 'Outstanding mastery across all tested competencies. Ready to unlock Foundation Week 2!'
                        : 'Identified minor concept gap in Constitutional Amendment majorities. Remediation unit added to your daily queue.'}
                    </p>
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTest(null)}
                      className="rounded-xl bg-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-orange-600"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
