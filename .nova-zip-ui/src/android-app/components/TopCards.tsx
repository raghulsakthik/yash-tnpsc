import React from 'react';
import { Layers, Flame, Trophy, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Course, UserProfile } from '../../types';

interface TopCardsProps {
  course: Course;
  profile: UserProfile;
  onResumeCourse: () => void;
  onOpenQuickLab: () => void;
}

export const TopCards: React.FC<TopCardsProps> = ({
  course,
  profile,
  onResumeCourse,
  onOpenQuickLab,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Card 1: Active Masterclass / Current Course */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-4.5 shadow-xs transition-all hover:border-orange-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800 dark:hover:border-neutral-700">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950/80 dark:text-orange-300">
              <Layers className="h-3.5 w-3.5" />
              Active Track
            </span>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {course.currentModule} of {course.totalModules}
            </span>
          </div>
          <h3 className="mt-2.5 font-bold text-sm text-neutral-900 line-clamp-1 dark:text-white">
            {course.title}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            UI & Interactive Components
          </p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
            <span>Overall Progress</span>
            <span className="font-bold text-orange-600 dark:text-orange-400">{course.progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${course.progress}%` }}
            />
          </div>
          <button
            onClick={onResumeCourse}
            className="mt-3 flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
          >
            <span>Continue Module</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

      {/* Card 2: Weekly Learning Goal & Streak */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-4.5 shadow-xs transition-all hover:border-amber-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800 dark:hover:border-neutral-700">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
              <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              {profile.streakDays}-Day Streak
            </span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              On Track
            </span>
          </div>
          <h3 className="mt-2.5 font-bold text-sm text-neutral-900 dark:text-white">
            Weekly Target: 5.0 Hours
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            4.5 hrs completed (90% goal reached)
          </p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
            <span>Weekly Study Meter</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">4.5 / 5.0 hrs</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: '90%' }}
            />
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>30 mins needed to reach weekly crown</span>
          </div>
        </div>
      </div>

      {/* Card 3: Quick Lab & Challenges Completed */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-4.5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800 dark:hover:border-neutral-700 sm:col-span-2 lg:col-span-1">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
              <Trophy className="h-3.5 w-3.5" />
              Lab Milestone
            </span>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Top 10% Cohort
            </span>
          </div>
          <h3 className="mt-2.5 font-bold text-sm text-neutral-900 dark:text-white">
            18 / 24 Challenges Solved
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Next: Wireframe Auto-Layout Sandbox
          </p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
            <span>Labs Mastery</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">75%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: '75%' }}
            />
          </div>
          <button
            onClick={onOpenQuickLab}
            className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          >
            <span>Launch Quick Lab</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
