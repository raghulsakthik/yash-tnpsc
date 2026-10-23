import React, { useState } from 'react';
import { Archive, Bookmark, CheckCircle, XCircle, ArrowRight, Filter, Sparkles, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PYQItem } from '../types';

interface PYQViewProps {
  pyqs: PYQItem[];
  onAddXp: (amount: number) => void;
}

export const PYQView: React.FC<PYQViewProps> = ({ pyqs, onAddXp }) => {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [items, setItems] = useState<PYQItem[]>(pyqs);

  const years = ['all', 2024, 2023, 2022];
  const subjects = ['all', 'Indian Polity', 'Aptitude', 'History', 'General Science'];

  const filtered = items.filter((item) => {
    if (selectedYear !== 'all' && item.year !== selectedYear) return false;
    if (selectedSubject !== 'all' && item.subject !== selectedSubject) return false;
    return true;
  });

  const handleSelectOption = (pyqId: string, optionIdx: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== pyqId) return item;
        const isCorrect = optionIdx === item.correctIndex;
        if (isCorrect && !item.attempted) {
          onAddXp(60);
          confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.6 },
          });
        }
        return {
          ...item,
          attempted: true,
          selectedOption: optionIdx,
        };
      })
    );
  };

  const handleToggleBookmark = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
              Previous Year Questions (PYQs)
            </h2>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Official TNPSC Group 2 question bank classified by year, subject, and topic
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>+60 XP per solved PYQ</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800">
        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Year:
          </span>
          <div className="flex rounded-xl bg-neutral-100 p-0.5 dark:bg-neutral-700">
            {years.map((y) => (
              <button
                key={String(y)}
                onClick={() => setSelectedYear(y as number | 'all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  selectedYear === y
                    ? 'bg-white text-orange-600 shadow-xs dark:bg-neutral-800 dark:text-white'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300'
                }`}
              >
                {y === 'all' ? 'All Years' : y}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Subject:
          </span>
          <div className="flex flex-wrap gap-1">
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  selectedSubject === sub
                    ? 'bg-orange-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300'
                }`}
              >
                {sub === 'all' ? 'All Subjects' : sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filtered.map((item, idx) => (
          <div
            key={item.id}
            className="rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-800 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                  {item.exam} • {item.year}
                </span>
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                  {item.subject}
                </span>
                <span className="text-xs text-neutral-400">
                  {item.chapter} › {item.topic}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleToggleBookmark(item.id)}
                className={`rounded-full p-1.5 transition-colors ${
                  item.isBookmarked
                    ? 'text-orange-500 fill-orange-500'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
                }`}
                title="Bookmark PYQ"
              >
                <Bookmark className={`h-4 w-4 ${item.isBookmarked ? 'fill-orange-500' : ''}`} />
              </button>
            </div>

            <h3 className="mt-3 text-sm font-bold text-neutral-900 dark:text-white sm:text-base leading-relaxed">
              Q{idx + 1}. {item.question}
            </h3>

            {/* Options */}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {item.options.map((opt, optIdx) => {
                const isSelected = item.selectedOption === optIdx;
                const isCorrect = optIdx === item.correctIndex;
                let btnClass =
                  'border-neutral-200 hover:border-orange-300 hover:bg-orange-50/20 text-neutral-800 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-600';

                if (item.attempted) {
                  if (isCorrect) {
                    btnClass =
                      'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200';
                  } else if (isSelected && !isCorrect) {
                    btnClass =
                      'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200';
                  } else {
                    btnClass = 'opacity-50 border-neutral-200 dark:border-neutral-700';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(item.id, optIdx)}
                    disabled={item.attempted}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-medium transition-all ${btnClass}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>

                    {item.attempted && isCorrect && (
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    {item.attempted && isSelected && !isCorrect && (
                      <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {item.attempted && (
              <div className="mt-4 rounded-2xl bg-neutral-50 p-4 border border-neutral-200 dark:border-neutral-700/80 dark:bg-neutral-800">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  Official Explanation & Reference:
                </span>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {item.explanation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
