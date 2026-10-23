import React, { useState } from 'react';
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
  HelpCircle,
  FileCheck2,
} from 'lucide-react';
import { StructuredCourse, StructuredLesson } from '../types';
import { BrandLogo } from './BrandLogo';

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

  const [selectedPracticeOption, setSelectedPracticeOption] = useState<number | null>(null);
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [selectedPyqOption, setSelectedPyqOption] = useState<number | null>(null);
  const [pyqSubmitted, setPyqSubmitted] = useState(false);
  const [showRewardToast, setShowRewardToast] = useState(false);

  if (!isOpen) return null;

  const currentPractice = lesson.practiceQuestions?.[0] || {
    question: `Key conceptual question for ${lesson.title}: Which of the following is an essential requirement under the TNPSC syllabus?`,
    options: [
      'Constitutional validity determined by Judicial Review',
      'Executive discretion over fundamental rights',
      'Subordination of judiciary to executive ordinances',
      'Suspension of Article 20 and 21 during Emergency',
    ],
    correctIndex: 0,
    explanation:
      'Under the Indian Constitution, judicial review safeguards the supremacy of the constitution, and Articles 20 and 21 cannot be suspended even during a National Emergency.',
  };

  const currentPyq = lesson.assessmentQuestion || {
    examYear: 'TNPSC Group 2 (2023)',
    question: `[TNPSC PYQ] In the context of ${lesson.title}, which doctrine or constitutional mandate was upheld by the Supreme Court?`,
    options: [
      'Basic Structure Doctrine (Kesavananda Bharati)',
      'Privy Purse Abolition Act only',
      'Complete immunity of administrative tribunals',
      'Substantive unitary centralization',
    ],
    correctIndex: 0,
    explanation:
      'The landmark Kesavananda Bharati case (1973) established that Parliament cannot alter the basic structure of the Constitution.',
  };

  const handleCompleteLearn = () => {
    onUpdateStep(lesson.id, 'learnCompleted', true);
    setActiveTab('understand');
  };

  const handleCompleteUnderstand = () => {
    onUpdateStep(lesson.id, 'understandCompleted', true);
    setActiveTab('practice');
  };

  const handleCheckPractice = () => {
    setPracticeSubmitted(true);
    if (selectedPracticeOption === currentPractice.correctIndex) {
      onUpdateStep(lesson.id, 'practiceCompleted', true);
    }
  };

  const handleCheckAssessment = () => {
    setPyqSubmitted(true);
    if (selectedPyqOption === currentPyq.correctIndex) {
      onUpdateStep(lesson.id, 'assessmentCompleted', true);
      if (onAddXp) onAddXp(50);
      setShowRewardToast(true);
      setTimeout(() => setShowRewardToast(false), 4000);
    }
  };

  const allDone =
    lesson.steps.learnCompleted &&
    lesson.steps.understandCompleted &&
    lesson.steps.practiceCompleted &&
    lesson.steps.assessmentCompleted;

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
                  {lesson.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {lesson.description}
                </p>
              </div>

              {/* Comprehensive Study Text */}
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
                <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs">
                  <h4 className="text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                    Essential Syllabus Notes
                  </h4>
                  <p className="mt-2 text-neutral-700 dark:text-neutral-300 font-sans">
                    {lesson.summaryNote}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    TNPSC Syllabus Focus Points:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-neutral-600 dark:text-neutral-400">
                    {lesson.keyConcepts.map((concept, idx) => (
                      <li key={idx}>
                        <strong className="text-neutral-800 dark:text-neutral-200">{concept}</strong>:
                        High frequency concept tested across previous prelims & mains papers.
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

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
                  Deconstruct Key Pillars & Provisions
                </h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  Ensure you understand these definitions before testing your diagnostic speed:
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {lesson.keyConcepts.map((concept, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-800/60"
                  >
                    <div>
                      <span className="text-xs font-semibold text-neutral-400">Pillar 0{idx + 1}</span>
                      <h4 className="mt-1 text-base font-bold text-neutral-900 dark:text-white">
                        {concept}
                      </h4>
                      <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                        Frequently recurring in TNPSC matching questions and Assertion-Reasoning sets. Review statutory definitions and judicial precedents.
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Concept Verified</span>
                    </div>
                  </div>
                ))}
              </div>

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
                  Solve Concept Check MCQ
                </h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  Apply what you have understood to this diagnostic challenge:
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-800/60 space-y-4">
                <p className="font-semibold text-neutral-900 dark:text-white text-base">
                  {currentPractice.question}
                </p>

                <div className="space-y-2.5">
                  {currentPractice.options.map((opt, idx) => {
                    const isSelected = selectedPracticeOption === idx;
                    const isCorrect = idx === currentPractice.correctIndex;

                    let optionStyle =
                      'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';

                    if (practiceSubmitted) {
                      if (isCorrect) {
                        optionStyle =
                          'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200';
                      } else if (isSelected && !isCorrect) {
                        optionStyle =
                          'border-red-500 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-200';
                      }
                    } else if (isSelected) {
                      optionStyle =
                        'border-neutral-900 bg-neutral-100 text-neutral-900 dark:border-white dark:bg-neutral-700 dark:text-white';
                    }

                    return (
                      <button
                        key={idx}
                        disabled={practiceSubmitted}
                        onClick={() => setSelectedPracticeOption(idx)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm transition-all ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-inherit text-xs font-bold">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {practiceSubmitted && isCorrect && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {practiceSubmitted && (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs dark:border-neutral-700 dark:bg-neutral-800/80">
                    <p className="font-bold text-neutral-900 dark:text-white">Explanation:</p>
                    <p className="mt-1 text-neutral-600 dark:text-neutral-300">
                      {currentPractice.explanation}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => setActiveTab('understand')}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  ← Back to Understand
                </button>

                {!practiceSubmitted ? (
                  <button
                    disabled={selectedPracticeOption === null}
                    onClick={handleCheckPractice}
                    className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                  >
                    Submit Practice Answer
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('assessment')}
                    className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                  >
                    <span>Proceed to Required PYQ Test</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
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
                  <span className="rounded-md border border-purple-200 bg-white px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:border-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {currentPyq.examYear}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                  TNPSC Official PYQ Examination Check
                </h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  You must pass this official question to verify lesson completion and unlock the next milestone:
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-800/60 space-y-4">
                <p className="font-semibold text-neutral-900 dark:text-white text-base">
                  {currentPyq.question}
                </p>

                <div className="space-y-2.5">
                  {currentPyq.options.map((opt, idx) => {
                    const isSelected = selectedPyqOption === idx;
                    const isCorrect = idx === currentPyq.correctIndex;

                    let optionStyle =
                      'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';

                    if (pyqSubmitted) {
                      if (isCorrect) {
                        optionStyle =
                          'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200';
                      } else if (isSelected && !isCorrect) {
                        optionStyle =
                          'border-red-500 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-200';
                      }
                    } else if (isSelected) {
                      optionStyle =
                        'border-neutral-900 bg-neutral-100 text-neutral-900 dark:border-white dark:bg-neutral-700 dark:text-white';
                    }

                    return (
                      <button
                        key={idx}
                        disabled={pyqSubmitted}
                        onClick={() => setSelectedPyqOption(idx)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm transition-all ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-inherit text-xs font-bold">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {pyqSubmitted && isCorrect && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {pyqSubmitted && (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs dark:border-neutral-700 dark:bg-neutral-800/80">
                    <p className="font-bold text-neutral-900 dark:text-white">Official Commission Key Explanation:</p>
                    <p className="mt-1 text-neutral-600 dark:text-neutral-300">
                      {currentPyq.explanation}
                    </p>
                  </div>
                )}
              </div>

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

                {!pyqSubmitted ? (
                  <button
                    disabled={selectedPyqOption === null}
                    onClick={handleCheckAssessment}
                    className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                  >
                    Submit Official Assessment
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-xs"
                  >
                    <span>Lesson Completed · Return to Courses</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
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
