import React, { useState } from 'react';
import { Archive, Bookmark, CheckCircle, XCircle, ArrowRight, Filter, Sparkles, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PYQItem } from '../../types';

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
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-in fade-in select-none">
      {/* Classical Academic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-500" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Previous Year Questions (PYQs)
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Authentic TNPSC Group 2 question bank classified by year, subject, and syllabus topic
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-amber-100/80 px-3.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-500/20 shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span>+60 XP per solved PYQ</span>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-400">Year:</span>
          <div className="flex items-center gap-1 rounded-xl bg-stone-100/80 p-0.5 dark:bg-stone-800 text-xs">
            {years.map((y) => (
              <button
                key={String(y)}
                onClick={() => setSelectedYear(y as number | 'all')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                  selectedYear === y
                    ? 'bg-white text-stone-900 shadow-2xs font-bold dark:bg-stone-700 dark:text-amber-400'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                {y === 'all' ? 'All' : y}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
          <span className="text-xs font-semibold text-stone-400 shrink-0">Subject:</span>
          <div className="flex items-center gap-1">
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedSubject === sub
                    ? 'bg-amber-500 text-white shadow-2xs font-bold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
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
            className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-xs hover:border-amber-400/60 transition-all dark:border-stone-800 dark:bg-stone-900 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-amber-100/90 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {item.exam} · {item.year}
                </span>
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  {item.subject} · {item.chapter} › {item.topic}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleToggleBookmark(item.id)}
                className={`rounded-full p-1.5 transition-colors cursor-pointer ${
                  item.isBookmarked
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
                }`}
                title="Bookmark PYQ"
              >
                <Bookmark className={`h-4 w-4 ${item.isBookmarked ? 'fill-amber-500' : ''}`} />
              </button>
            </div>

            <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">
              Q{idx + 1}. {item.question}
            </h3>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {item.options.map((opt, optIdx) => {
                const isSelected = item.selectedOption === optIdx;
                const isCorrect = optIdx === item.correctIndex;
                let btnClass =
                  'border-stone-200/90 bg-white hover:border-amber-400 hover:bg-amber-50/20 text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200';

                if (item.attempted) {
                  if (isCorrect) {
                    btnClass =
                      'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-500/30';
                  } else if (isSelected && !isCorrect) {
                    btnClass =
                      'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 ring-1 ring-rose-500/30';
                  } else {
                    btnClass = 'opacity-40 border-stone-200 dark:border-stone-800';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(item.id, optIdx)}
                    disabled={item.attempted}
                    className={`flex items-center justify-between rounded-2xl border p-3 text-left text-xs font-medium transition-all cursor-pointer ${btnClass}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>

                    {item.attempted && isCorrect && (
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    {item.attempted && isSelected && !isCorrect && (
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Official Provenance & Explanation */}
            {item.attempted && (
              <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200 dark:border-stone-800 dark:bg-stone-800/60 space-y-1">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Official Answer & Syllabus Rationale:
                </span>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
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
