import React from 'react';
import { Play, Bookmark, ArrowRight } from 'lucide-react';
import { Course } from '../types';

interface ContinueLearningCardProps {
  course: Course;
  onResume: () => void;
  onToggleBookmark: (courseId: string) => void;
}

export const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({
  course,
  onResume,
  onToggleBookmark,
}) => {
  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white sm:text-xl">
          Continue Learning
        </h2>
      </div>

      <div className="overflow-hidden rounded-3xl border border-neutral-200/90 bg-white p-4 shadow-xs transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800 sm:p-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          {/* Left Thumbnail: Orange rounded container matching reference image */}
          <div className="relative flex aspect-16/10 flex-col justify-between overflow-hidden rounded-2xl bg-linear-to-br from-[#f95c1c] to-[#e44c0c] p-5 text-white shadow-inner sm:aspect-16/9 lg:col-span-5 lg:aspect-4/3">
            {/* Top row: Module pill + Bookmark ribbon */}
            <div className="flex items-center justify-between z-10">
              <span className="rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                {course.currentModule}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(course.id);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-all hover:bg-white/30 hover:scale-105 ${
                  course.isBookmarked ? 'text-white' : 'text-white/80'
                }`}
                aria-label={course.isBookmarked ? 'Remove bookmark' : 'Bookmark course'}
              >
                <Bookmark
                  className={`h-4 w-4 ${course.isBookmarked ? 'fill-white' : ''}`}
                />
              </button>
            </div>

            {/* Center Play Button */}
            <div className="flex items-center justify-center z-10">
              <button
                type="button"
                onClick={onResume}
                aria-label={`Play ${course.title}`}
                className="group/btn flex h-14 w-14 items-center justify-center rounded-full bg-white/25 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/35 active:scale-95"
              >
                <Play className="ml-1 h-6 w-6 fill-white text-white transition-transform group-hover/btn:scale-105" />
              </button>
            </div>

            {/* Bottom Label: "Advanced UI Design" */}
            <div className="z-10">
              <p className="text-sm font-semibold tracking-wide text-white/95">
                {course.thumbnailTag}
              </p>
            </div>

            {/* Subtle decorative geometric overlay */}
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-xl" />
            <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-black/5 blur-lg" />
          </div>

          {/* Right Details: Metadata, Title, Description, Progress & Resume CTA */}
          <div className="flex flex-col justify-between py-1 lg:col-span-7 lg:pr-2">
            <div>
              {/* Category tag */}
              <span className="text-xs font-semibold tracking-wide text-orange-600 dark:text-orange-400">
                {course.category}
              </span>

              {/* Course Title */}
              <h3 className="mt-1 text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
                {course.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {course.description}
              </p>
            </div>

            {/* Progress Section and Button */}
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Progress
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {course.progress}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-[#f95c1c] transition-all duration-500"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>

              {/* CTA Button */}
              <div>
                <button
                  type="button"
                  onClick={onResume}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e55317] px-6 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#cb440e] hover:shadow-md active:scale-98"
                >
                  <span>Resume Course</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
