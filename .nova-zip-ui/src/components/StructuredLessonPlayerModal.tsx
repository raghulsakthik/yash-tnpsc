import React, { useEffect, useState } from 'react';
import {
  X,
  BookOpen,
  Brain,
  PenTool,
  Award,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { StructuredCourse, StructuredLesson } from '../types';
import { BrandLogo } from './BrandLogo';
import { novaApi } from '../api/novaApi';

interface StructuredLessonPlayerModalProps {
  course: StructuredCourse;
  lesson: StructuredLesson;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStep: (
    lessonId: string,
    stepKey: keyof StructuredLesson['steps'],
    completed: boolean
  ) => void;
  onAddXp?: (amount: number) => void;
}

type AnswerResult = { correct: boolean; correctIndex: number; explanation: string } | null;

export const StructuredLessonPlayerModal: React.FC<StructuredLessonPlayerModalProps> = ({
  course,
  lesson,
  isOpen,
  onClose,
  onUpdateStep,
  onAddXp,
}) => {
  const [activeTab, setActiveTab] = useState<'learn' | 'understand' | 'practice' | 'assessment'>(
    !lesson.steps.learnCompleted
      ? 'learn'
      : !lesson.steps.understandCompleted
      ? 'understand'
      : !lesson.steps.practiceCompleted
      ? 'practice'
      : 'assessment'
  );

  // Real lesson content (src/app/api/lesson/:topic), fetched for this
  // lesson's real topic id -- lesson.id IS the topic id (see
  // mapStructuredCourses in api/novaApi.ts).
  const [lessonContent, setLessonContent] = useState<any>(null);
  const [lessonLoading, setLessonLoading] = useState(true);
  const [lessonError, setLessonError] = useState(false);

  // Real practice question (src/app/api/questions/next) and its graded
  // result -- the backend never reveals the correct answer until a real
  // attempt is submitted (src/app/api/attempts).
  const [practiceQuestion, setPracticeQuestion] = useState<any>(null);
  const [practiceLoading, setPracticeLoading] = useState(true);
  const [selectedPracticeOption, setSelectedPracticeOption] = useState<number | null>(null);
  const [practiceResult, setPracticeResult] = useState<AnswerResult>(null);
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);

  // Real PYQ (src/app/api/pyqs/next?topic=), scoped to this topic -- some
  // topics genuinely have no PYQ yet, which is shown honestly, not faked.
  const [pyqQuestion, setPyqQuestion] = useState<any>(null);
  const [pyqLoading, setPyqLoading] = useState(true);
  const [selectedPyqOption, setSelectedPyqOption] = useState<number | null>(null);
  const [pyqResult, setPyqResult] = useState<AnswerResult>(null);
  const [pyqSubmitting, setPyqSubmitting] = useState(false);
  const [showRewardToast, setShowRewardToast] = useState(false);
  const practiceStartedAt = React.useRef<number>(Date.now());
  const pyqStartedAt = React.useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    setLessonLoading(true);
    setLessonError(false);
    novaApi.lesson(lesson.id)
      .then((data) => { if (!cancelled) setLessonContent(data); })
      .catch(() => { if (!cancelled) setLessonError(true); })
      .finally(() => { if (!cancelled) setLessonLoading(false); });

    setPracticeLoading(true);
    setPracticeQuestion(null);
    setSelectedPracticeOption(null);
    setPracticeResult(null);
    novaApi.question(lesson.id)
      .then((data) => { if (!cancelled) { setPracticeQuestion(data); practiceStartedAt.current = Date.now(); } })
      .catch(() => { if (!cancelled) setPracticeQuestion(null); })
      .finally(() => { if (!cancelled) setPracticeLoading(false); });

    setPyqLoading(true);
    setPyqQuestion(null);
    setSelectedPyqOption(null);
    setPyqResult(null);
    novaApi.pyqForTopic(lesson.id)
      .then((data) => { if (!cancelled) { setPyqQuestion(data); pyqStartedAt.current = Date.now(); } })
      .catch(() => { if (!cancelled) setPyqQuestion(null); })
      .finally(() => { if (!cancelled) setPyqLoading(false); });

    return () => { cancelled = true; };
  }, [lesson.id]);

  if (!isOpen) return null;

  const handleCompleteLearn = () => {
    onUpdateStep(lesson.id, 'learnCompleted', true);
    setActiveTab('understand');
  };

  const handleCompleteUnderstand = () => {
    onUpdateStep(lesson.id, 'understandCompleted', true);
    setActiveTab('practice');
  };

  const handleSubmitPractice = async () => {
    if (!practiceQuestion || selectedPracticeOption === null) return;
    setPracticeSubmitting(true);
    try {
      const result = await novaApi.attempt({
        attemptId: crypto.randomUUID(),
        questionId: practiceQuestion.questionId,
        selectedIndex: selectedPracticeOption,
        timeTakenMs: Date.now() - practiceStartedAt.current,
        mode: 'PRACTICE',
      });
      setPracticeResult({ correct: Boolean(result.correct), correctIndex: Number(result.correctIndex), explanation: result.explanation || '' });
      if (result.correct) onUpdateStep(lesson.id, 'practiceCompleted', true);
    } finally {
      setPracticeSubmitting(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!pyqQuestion || selectedPyqOption === null) return;
    setPyqSubmitting(true);
    try {
      const result = await novaApi.attempt({
        attemptId: crypto.randomUUID(),
        questionId: pyqQuestion.questionId,
        selectedIndex: selectedPyqOption,
        timeTakenMs: Date.now() - pyqStartedAt.current,
        mode: 'PRACTICE',
      });
      setPyqResult({ correct: Boolean(result.correct), correctIndex: Number(result.correctIndex), explanation: result.explanation || '' });
      if (result.correct) {
        onUpdateStep(lesson.id, 'assessmentCompleted', true);
        if (onAddXp) onAddXp(50);
        setShowRewardToast(true);
        setTimeout(() => setShowRewardToast(false), 4000);
      }
    } finally {
      setPyqSubmitting(false);
    }
  };

  const hasLessonContent = Boolean(lessonContent?.concept || lessonContent?.definition || (lessonContent?.resources || []).length);
  const reinforcementPoints: string[] = [
    ...(lessonContent?.formulas || []),
    ...(lessonContent?.shortcuts || []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Structured Lesson Player"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showWordmark={false} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {course.title}
                </span>
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                  Lesson {lesson.lessonNumber} ({lesson.durationMinutes} min)
                </span>
              </div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {lesson.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Close lesson modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4-Phase Progression Tracker Tabs */}
        <div className="grid grid-cols-4 border-b border-neutral-200 bg-neutral-100/60 p-2 text-xs font-medium dark:border-neutral-800 dark:bg-neutral-950/40">
          <button
            onClick={() => setActiveTab('learn')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              activeTab === 'learn'
                ? 'bg-white font-semibold text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">1. Learn</span>
            {lesson.steps.learnCompleted && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('understand')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              activeTab === 'understand'
                ? 'bg-white font-semibold text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Brain className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">2. Understand</span>
            {lesson.steps.understandCompleted && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              activeTab === 'practice'
                ? 'bg-white font-semibold text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <PenTool className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">3. Practice</span>
            {lesson.steps.practiceCompleted && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              activeTab === 'assessment'
                ? 'bg-white font-semibold text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Award className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">4. PYQ Test</span>
            {lesson.steps.assessmentCompleted && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* STEP 1: LEARN */}
          {activeTab === 'learn' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-800/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Step 1 of 4 · Syllabus Foundation
                </span>
                <h3 className="mt-1 text-xl font-bold text-neutral-900 dark:text-white">
                  {lessonContent?.title || lesson.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {lesson.description}
                </p>
              </div>

              {lessonLoading ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading real lesson content…</p>
              ) : !hasLessonContent ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400">
                  No lesson content has been written for this topic yet. You can still practice and attempt real questions below.
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
                  {lessonContent?.concept && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs">
                      <h4 className="text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                        <FileCheck2 className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                        Concept
                      </h4>
                      <p className="mt-2 text-neutral-700 dark:text-neutral-300 font-sans">{lessonContent.concept}</p>
                    </div>
                  )}
                  {lessonContent?.example?.problem && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs">
                      <h4 className="text-base font-semibold text-neutral-900 dark:text-white">Worked Example</h4>
                      <p className="mt-2 text-neutral-700 dark:text-neutral-300">{lessonContent.example.problem}</p>
                      {Array.isArray(lessonContent.example.steps) && lessonContent.example.steps.length > 0 && (
                        <ol className="mt-2 list-decimal pl-5 space-y-1 text-neutral-600 dark:text-neutral-400">
                          {lessonContent.example.steps.map((step: string, idx: number) => <li key={idx}>{step}</li>)}
                        </ol>
                      )}
                      {lessonContent.example.answer && (
                        <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Answer: {lessonContent.example.answer}</p>
                      )}
                    </div>
                  )}
                  {(lessonContent?.resources || []).map((r: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs">
                      <h4 className="text-base font-semibold text-neutral-900 dark:text-white">{r.title}</h4>
                      <p className="mt-2 text-neutral-700 dark:text-neutral-300">{r.body}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={handleCompleteLearn}
                  className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-colors"
                >
                  <span>Complete Reading & Proceed</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: UNDERSTAND */}
          {activeTab === 'understand' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Step 2 of 4 · Conceptual Clarity
                </span>
                <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                  Formulas, Shortcuts & Common Mistakes
                </h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  Review these before testing yourself in Practice:
                </p>
              </div>

              {reinforcementPoints.length === 0 && !(lessonContent?.commonMistakes || []).length ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400">
                  No formulas, shortcuts or common-mistake notes have been added for this topic yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {reinforcementPoints.map((point, idx) => (
                    <div key={idx} className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-800/60">
                      <p className="text-sm text-neutral-800 dark:text-neutral-200">{point}</p>
                    </div>
                  ))}
                  {(lessonContent?.commonMistakes || []).map((point: string, idx: number) => (
                    <div key={`mistake-${idx}`} className="flex flex-col justify-between rounded-2xl border border-red-200 bg-red-50/40 p-5 dark:border-red-900/40 dark:bg-red-950/20">
                      <span className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400">Common Mistake</span>
                      <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">{point}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => setActiveTab('learn')}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  ← Back to Learn
                </button>
                <button
                  onClick={handleCompleteUnderstand}
                  className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-colors"
                >
                  <span>Verify Concept & Start Practice</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PRACTICE */}
          {activeTab === 'practice' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Step 3 of 4 · Adaptive Guided Practice
                </span>
                <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                  Solve a Real Practice Question
                </h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  Graded by the real adaptive engine -- this updates your real topic mastery.
                </p>
              </div>

              {practiceLoading ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading a real question for this topic…</p>
              ) : !practiceQuestion ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400">
                  No published question is available for this topic yet.
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-800/60 space-y-4">
                  <p className="font-semibold text-neutral-900 dark:text-white text-base">
                    {practiceQuestion.prompt}
                  </p>

                  <div className="space-y-2.5">
                    {(practiceQuestion.options || []).map((opt: string, idx: number) => {
                      const isSelected = selectedPracticeOption === idx;
                      const isCorrect = practiceResult ? idx === practiceResult.correctIndex : false;

                      let optionStyle =
                        'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';

                      if (practiceResult) {
                        if (isCorrect) {
                          optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200';
                        } else if (isSelected && !isCorrect) {
                          optionStyle = 'border-red-500 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-200';
                        }
                      } else if (isSelected) {
                        optionStyle = 'border-neutral-900 bg-neutral-100 text-neutral-900 dark:border-white dark:bg-neutral-700 dark:text-white';
                      }

                      return (
                        <button
                          key={idx}
                          disabled={Boolean(practiceResult)}
                          onClick={() => setSelectedPracticeOption(idx)}
                          className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm transition-all ${optionStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-inherit text-xs font-bold">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {practiceResult && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {practiceResult && (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs dark:border-neutral-700 dark:bg-neutral-800/80">
                      <p className="font-bold text-neutral-900 dark:text-white">Explanation:</p>
                      <p className="mt-1 text-neutral-600 dark:text-neutral-300">{practiceResult.explanation}</p>
                      {!practiceResult.correct && (
                        <p className="mt-2 font-semibold text-red-600 dark:text-red-400">Not quite -- this step only clears on a correct answer. Try again from Practice once you review.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => setActiveTab('understand')}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  ← Back to Understand
                </button>

                {!practiceResult ? (
                  <button
                    disabled={selectedPracticeOption === null || !practiceQuestion || practiceSubmitting}
                    onClick={handleSubmitPractice}
                    className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                  >
                    {practiceSubmitting ? 'Submitting…' : 'Submit Practice Answer'}
                  </button>
                ) : practiceResult.correct ? (
                  <button
                    onClick={() => setActiveTab('assessment')}
                    className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                  >
                    <span>Proceed to Required PYQ Test</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* STEP 4: ASSESSMENT & PYQ */}
          {activeTab === 'assessment' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="rounded-2xl border border-purple-200/80 bg-purple-50/50 p-5 dark:border-purple-900/40 dark:bg-purple-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                    Step 4 of 4 · Required Assessment Barrier
                  </span>
                  {pyqQuestion?.difficulty && (
                    <span className="rounded-md border border-purple-200 bg-white px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:border-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      {pyqQuestion.difficulty}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                  Real TNPSC Previous-Year Question
                </h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  You must answer this correctly to verify lesson completion:
                </p>
              </div>

              {pyqLoading ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading a real past-year question for this topic…</p>
              ) : !pyqQuestion ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400">
                  No real past-year question exists for this topic yet, so this step is honestly skipped rather than faked.
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-800/60 space-y-4">
                  <p className="font-semibold text-neutral-900 dark:text-white text-base">
                    {pyqQuestion.prompt}
                  </p>

                  <div className="space-y-2.5">
                    {(pyqQuestion.options || []).map((opt: string, idx: number) => {
                      const isSelected = selectedPyqOption === idx;
                      const isCorrect = pyqResult ? idx === pyqResult.correctIndex : false;

                      let optionStyle =
                        'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';

                      if (pyqResult) {
                        if (isCorrect) {
                          optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200';
                        } else if (isSelected && !isCorrect) {
                          optionStyle = 'border-red-500 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-200';
                        }
                      } else if (isSelected) {
                        optionStyle = 'border-neutral-900 bg-neutral-100 text-neutral-900 dark:border-white dark:bg-neutral-700 dark:text-white';
                      }

                      return (
                        <button
                          key={idx}
                          disabled={Boolean(pyqResult)}
                          onClick={() => setSelectedPyqOption(idx)}
                          className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm transition-all ${optionStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-inherit text-xs font-bold">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {pyqResult && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {pyqResult && (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs dark:border-neutral-700 dark:bg-neutral-800/80">
                      <p className="font-bold text-neutral-900 dark:text-white">Explanation:</p>
                      <p className="mt-1 text-neutral-600 dark:text-neutral-300">{pyqResult.explanation}</p>
                      {!pyqResult.correct && (
                        <p className="mt-2 font-semibold text-red-600 dark:text-red-400">Not quite -- the assessment step only clears on a correct answer.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Toast for completion reward */}
              {showRewardToast && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200 flex items-center justify-between animate-in zoom-in-95">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-xs font-bold">Assessment Passed! +50 XP Awarded</p>
                      <p className="text-[11px] opacity-80">
                        Lesson completion metrics updated in your permanent course ledger.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => setActiveTab('practice')}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  ← Back to Practice
                </button>

                {!pyqQuestion ? (
                  <button
                    onClick={() => { onUpdateStep(lesson.id, 'assessmentCompleted', true); onClose(); }}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-xs"
                  >
                    <span>No PYQ Available · Mark Lesson Complete</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : !pyqResult ? (
                  <button
                    disabled={selectedPyqOption === null || pyqSubmitting}
                    onClick={handleSubmitAssessment}
                    className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                  >
                    {pyqSubmitting ? 'Submitting…' : 'Submit Official Assessment'}
                  </button>
                ) : pyqResult.correct ? (
                  <button
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-xs"
                  >
                    <span>Lesson Completed · Return to Courses</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-3 bg-neutral-50/50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Completion Rule: Learn → Understand → Practice → Pass Assessment</span>
          </div>
          <span>TNPSC Group 2 & 2A Standard</span>
        </div>
      </div>
    </div>
  );
};
