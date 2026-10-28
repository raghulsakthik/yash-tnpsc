import React from 'react';
import { Bookmark, Play, ArrowRight, Trash2 } from 'lucide-react';
import { Course } from '../../types';

interface BookmarksViewProps {
  courses: Course[];
  onResumeCourse: (course: Course) => void;
  onToggleBookmark: (courseId: string) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  courses,
  onResumeCourse,
  onToggleBookmark,
}) => {
  const bookmarkedCourses = courses.filter((c) => c.isBookmarked);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-orange-500 fill-orange-500" />
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
            Saved Bookmarks
          </h2>
        </div>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Courses, masterclasses, and exercises saved for quick review
        </p>
      </div>

      {bookmarkedCourses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <Bookmark className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <h3 className="mt-3 text-sm font-bold text-neutral-800 dark:text-neutral-200">
            No Bookmarks Saved
          </h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Click the bookmark icon on any course card to pin it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {bookmarkedCourses.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    {c.currentModule}
                  </span>
                  <button
                    onClick={() => onToggleBookmark(c.id)}
                    className="text-orange-600 hover:text-neutral-400 dark:text-orange-400"
                    title="Remove from bookmarks"
                  >
                    <Bookmark className="h-4 w-4 fill-orange-500 text-orange-500" />
                  </button>
                </div>

                <span className="mt-3 block text-xs font-semibold text-orange-600 dark:text-orange-400">
                  {c.category}
                </span>
                <h3 className="mt-1 text-base font-bold text-neutral-900 dark:text-white">
                  {c.title}
                </h3>
                <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2">
                  {c.description}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  <span>Progress</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{c.progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>

                <button
                  onClick={() => onResumeCourse(c)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 active:scale-98"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>Resume Course</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
