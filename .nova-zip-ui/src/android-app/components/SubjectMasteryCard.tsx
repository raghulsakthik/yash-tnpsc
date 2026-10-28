import React, { useState } from 'react';
import { BookOpen, ChevronRight, Award, Layers } from 'lucide-react';
import { SubjectMastery } from '../../types';

interface SubjectMasteryCardProps {
  subjects: SubjectMastery[];
  onSelectSubject?: (subjectId: string) => void;
}

export const SubjectMasteryCard: React.FC<SubjectMasteryCardProps> = ({
  subjects,
  onSelectSubject,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectMastery | null>(null);

  const getStatusBadge = (status: SubjectMastery['status']) => {
    switch (status) {
      case 'Mastered':
      case 'Strong':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'Familiar':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'Developing':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'Weak':
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    }
  };

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white sm:text-xl">
            Subject Mastery
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Real-time competency assessment across TNPSC Group 2 curriculum
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-800 sm:p-6">
        <div className="space-y-4">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              onClick={() => setSelectedSubject(sub)}
              className="group cursor-pointer rounded-2xl p-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {sub.name}
                  </span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${getStatusBadge(sub.status)}`}>
                    {sub.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                    {sub.topicsCount} topics
                  </span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {sub.masteryPercentage}%
                  </span>
                </div>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                <div
                  className={`h-full rounded-full ${sub.color} transition-all duration-700`}
                  style={{ width: `${sub.masteryPercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Subject Overview Drawer / Modal */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs"
            onClick={() => setSelectedSubject(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Subject Overview
                </span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {selectedSubject.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSubject(null)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                <span className="text-neutral-500">Overall Mastery:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{selectedSubject.masteryPercentage}%</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                <span className="text-neutral-500">Curriculum Topics:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{selectedSubject.topicsCount} Topics</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                <span className="text-neutral-500">Competency Tier:</span>
                <span className="font-bold text-emerald-600">{selectedSubject.status}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedSubject(null)}
                className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
