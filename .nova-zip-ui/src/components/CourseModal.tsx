import React, { useState } from 'react';
import {
  X,
  Play,
  Pause,
  CheckCircle2,
  Circle,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  Download,
  Share2,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course } from '../types';

interface CourseModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onToggleLesson: (lessonId: string) => void;
  onAddXp: (amount: number) => void;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  course,
  isOpen,
  onClose,
  onToggleLesson,
  onAddXp,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'syllabus' | 'sandbox' | 'notes'>('syllabus');
  const [selectedState, setSelectedState] = useState<'default' | 'hover' | 'active' | 'loading' | 'disabled'>('default');

  if (!isOpen) return null;

  const handleLessonToggle = (lessonId: string, currentlyCompleted: boolean) => {
    onToggleLesson(lessonId);
    if (!currentlyCompleted) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ea580c', '#f97316', '#fbbf24', '#10b981'],
      });
      onAddXp(120);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              {course.currentModule}
            </span>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white sm:text-lg">
                {course.title}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {course.category} • {course.progress}% Completed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x divide-neutral-200 dark:divide-neutral-800">
            {/* Left Column: Player & Interactive Sandbox */}
            <div className="p-6 lg:col-span-7 space-y-6">
              {/* Simulated Video Player */}
              <div className="relative aspect-16/9 overflow-hidden rounded-2xl bg-neutral-950 shadow-inner">
                {/* Visual Video Backdrop */}
                <div className="absolute inset-0 flex flex-col justify-between p-6 bg-linear-to-tr from-neutral-950 via-neutral-900 to-orange-950/40">
                  <div className="flex justify-between items-center text-xs text-white/80">
                    <span className="rounded-md bg-black/40 px-2.5 py-1 backdrop-blur-md">
                      HD 1080p • Module 4.4
                    </span>
                    <span className="rounded-md bg-orange-600/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Live Workshop
                    </span>
                  </div>

                  {/* Center Play Button Overlay */}
                  <div className="flex flex-col items-center justify-center">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="group flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/90 text-white shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-orange-500 active:scale-95"
                      aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    >
                      {isPlaying ? (
                        <Pause className="h-7 w-7 fill-white" />
                      ) : (
                        <Play className="ml-1 h-7 w-7 fill-white" />
                      )}
                    </button>
                    <p className="mt-3 text-xs font-medium text-white/90">
                      {isPlaying ? 'Playing: Interactive States & Spring Physics' : 'Click to resume lesson stream'}
                    </p>
                  </div>

                  {/* Player Controls Bar */}
                  <div className="flex items-center justify-between text-white/90 text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="hover:text-orange-400"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="hover:text-orange-400"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                      <span>14:20 / 30:00</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-sm bg-white/20 px-1.5 py-0.5 text-[10px]">1.0x</span>
                      <Maximize2 className="h-4 w-4 cursor-pointer hover:text-orange-400" />
                    </div>
                  </div>
                </div>

                {/* Scrubber Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div className="h-full bg-orange-500" style={{ width: '48%' }} />
                </div>
              </div>

              {/* Tabs for extra interactive learning */}
              <div>
                <div className="flex border-b border-neutral-200 dark:border-neutral-800">
                  <button
                    onClick={() => setActiveTab('syllabus')}
                    className={`pb-2.5 px-4 text-xs font-bold transition-colors ${
                      activeTab === 'syllabus'
                        ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Curriculum & Progress
                  </button>
                  <button
                    onClick={() => setActiveTab('sandbox')}
                    className={`pb-2.5 px-4 text-xs font-bold transition-colors ${
                      activeTab === 'sandbox'
                        ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Interactive Component Lab
                  </button>
                </div>

                {/* Interactive Component Lab Tab */}
                {activeTab === 'sandbox' && (
                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4.5 dark:border-neutral-800 dark:bg-neutral-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Live State Previewer
                      </h4>
                      <span className="text-xs text-orange-600 font-semibold dark:text-orange-400">
                        Hands-On Exercise
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                      Switch states to inspect CSS tokens, accessibility borders, and cursor styling:
                    </p>

                    {/* State Selector Buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(['default', 'hover', 'active', 'loading', 'disabled'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedState(s)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                            selectedState === s
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'bg-white text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {/* Preview Artboard */}
                    <div className="mt-4 flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                      {selectedState === 'default' && (
                        <button className="rounded-xl bg-[#e55317] px-6 py-2.5 font-semibold text-white shadow-sm">
                          Primary Action
                        </button>
                      )}
                      {selectedState === 'hover' && (
                        <button className="rounded-xl bg-[#c2410c] px-6 py-2.5 font-semibold text-white shadow-md ring-2 ring-orange-200 dark:ring-orange-900">
                          Hover State Preview
                        </button>
                      )}
                      {selectedState === 'active' && (
                        <button className="scale-95 rounded-xl bg-[#9a3412] px-6 py-2.5 font-semibold text-white shadow-inner">
                          Pressed / Active
                        </button>
                      )}
                      {selectedState === 'loading' && (
                        <button className="flex items-center gap-2 rounded-xl bg-[#e55317]/80 px-6 py-2.5 font-semibold text-white cursor-wait">
                          <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Processing...</span>
                        </button>
                      )}
                      {selectedState === 'disabled' && (
                        <button disabled className="cursor-not-allowed rounded-xl bg-neutral-300 px-6 py-2.5 font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-600">
                          Disabled State
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Lessons Checklist */}
            <div className="p-6 lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Course Modules & Lessons
                </h3>
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  {course.lessons.filter((l) => l.completed).length} of {course.lessons.length} Done
                </span>
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Click any lesson to toggle completion and boost your XP & streak stats.
              </p>

              <div className="space-y-2.5">
                {course.lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    onClick={() => handleLessonToggle(lesson.id, lesson.completed)}
                    className={`group flex items-start gap-3 rounded-2xl border p-3.5 transition-all cursor-pointer ${
                      lesson.completed
                        ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20'
                        : 'border-neutral-200 hover:border-orange-300 hover:bg-orange-50/20 dark:border-neutral-800 dark:hover:border-neutral-700'
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 shrink-0 text-neutral-400 group-hover:text-orange-500"
                      aria-label={`Toggle lesson ${lesson.title}`}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-100 dark:text-emerald-400 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-neutral-400">
                          Lesson {idx + 1}
                        </span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          {lesson.duration}
                        </span>
                      </div>
                      <h4
                        className={`text-xs font-bold ${
                          lesson.completed
                            ? 'text-neutral-800 line-through decoration-neutral-400 dark:text-neutral-300'
                            : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {lesson.title}
                      </h4>
                      <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {lesson.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bonus XP Banner */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-linear-to-r from-orange-500/10 to-amber-500/10 p-3 border border-orange-200 dark:border-orange-900/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Earn +120 XP per completed lesson
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
