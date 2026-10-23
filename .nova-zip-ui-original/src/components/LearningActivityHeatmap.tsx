import React, { useState } from 'react';
import { ActivityDay } from '../types';

interface LearningActivityHeatmapProps {
  activities: ActivityDay[];
}

export const LearningActivityHeatmap: React.FC<LearningActivityHeatmapProps> = ({
  activities,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{
    day: ActivityDay;
    x: number;
    y: number;
  } | null>(null);

  // Group activities into 52 or 53 weeks (columns), 7 days each
  // Pad with leading empty cells if needed so weeks align properly
  const totalDays = activities.length;
  const numWeeks = Math.ceil(totalDays / 7);

  const weeks: (ActivityDay | null)[][] = [];
  for (let w = 0; w < numWeeks; w++) {
    const week: (ActivityDay | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      week.push(idx < totalDays ? activities[idx] : null);
    }
    weeks.push(week);
  }

  // Activity cell color mapper matching Image 2
  const getColorClass = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-[#a7f3d0] dark:bg-[#065f46]'; // light green
      case 2:
        return 'bg-[#4ade80] dark:bg-[#059669]'; // vibrant green
      case 3:
        return 'bg-[#16a34a] dark:bg-[#10b981]'; // deep emerald
      case 4:
        return 'bg-[#14532d] dark:bg-[#34d399]'; // darkest forest green
      case 0:
      default:
        return 'bg-[#ebedf0] dark:bg-neutral-800'; // empty cell
    }
  };

  const totalCompletedActivities = activities.reduce((acc, curr) => acc + curr.count, 0);
  const activeDaysCount = activities.filter((a) => a.count > 0).length;

  return (
    <section className="space-y-3.5">
      {/* Header matching Image 2: "Learning Activity" & "Last 365 days" */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white sm:text-xl">
          Learning Activity
        </h2>
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Last 365 days
        </span>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800 sm:p-6">
        {/* Heatmap Grid Container with horizontal scroll on small devices */}
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="inline-flex min-w-[680px] flex-col gap-1.5">
            <div className="flex gap-1.5">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1.5">
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${dayIndex}`}
                          className="h-3.5 w-3.5 rounded-sm opacity-0"
                        />
                      );
                    }
                    return (
                      <div
                        key={day.date}
                        className={`h-3.5 w-3.5 rounded-sm transition-transform duration-150 hover:scale-125 hover:ring-2 hover:ring-orange-400 cursor-pointer ${getColorClass(
                          day.level
                        )}`}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({
                            day,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                          });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        aria-label={`${day.date}: ${day.count} activities`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Tooltip */}
        {hoveredDay && (
          <div
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-xl dark:bg-white dark:text-neutral-900"
            style={{ left: `${hoveredDay.x}px`, top: `${hoveredDay.y}px` }}
          >
            <div>
              {hoveredDay.day.count > 0 ? (
                <span>
                  <strong className="font-bold">{hoveredDay.day.count} lessons / labs</strong> on{' '}
                  {new Date(hoveredDay.day.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              ) : (
                <span>
                  No activity on{' '}
                  {new Date(hoveredDay.day.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Legend matching Image 2 bottom-right: "Less [squares] More" */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 pt-4 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <div className="flex items-center gap-4">
            <span>
              <strong className="font-semibold text-neutral-800 dark:text-neutral-200">
                {totalCompletedActivities}
              </strong>{' '}
              learning sessions in the last year
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              <strong className="font-semibold text-neutral-800 dark:text-neutral-200">
                {activeDaysCount}
              </strong>{' '}
              active days
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-xs bg-[#ebedf0] dark:bg-neutral-800" />
              <span className="h-3 w-3 rounded-xs bg-[#a7f3d0] dark:bg-[#065f46]" />
              <span className="h-3 w-3 rounded-xs bg-[#4ade80] dark:bg-[#059669]" />
              <span className="h-3 w-3 rounded-xs bg-[#16a34a] dark:bg-[#10b981]" />
              <span className="h-3 w-3 rounded-xs bg-[#14532d] dark:bg-[#34d399]" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </section>
  );
};
